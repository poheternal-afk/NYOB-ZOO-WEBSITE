"""
============================================================================
TRILINGUO / NYOB ZOO — COMMUNITY CONTRIBUTION & ADMIN CORPUS TRAINING ROUTER
(routers/corpus.py)
Enables continuous incremental learning from 2 sources:
1. Learner Role ('user_contribution'): 3-field form (Hmong required + >=1 of VI/EN)
2. Admin / Super Admin Role ('admin_document'): Multi-format document upload (.csv, .tsv, .txt, .json, .md)
============================================================================
"""

from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, CorpusEntry, CorpusDocumentLog
from schemas import (
    UserContributionCreateRequest,
    AdminDocumentUploadRequest,
)
from dependencies import get_optional_user, get_current_admin
from services.translator import (
    normalize_text,
    generate_hmong_phonetics,
    infer_pos_code,
    infer_phrase_category,
    auto_complete_missing_translation,
    sync_dynamic_corpus_from_db,
    extract_text_from_binary_document,
    parse_document_content_to_entries,
)

router = APIRouter(prefix="/api/corpus", tags=["Community Contribution & Admin Corpus Training"])


def serialize_corpus_entry(entry: CorpusEntry) -> dict:
    hmn = entry.hmn_text or ""
    vi = entry.vi_text or ""
    en = entry.en_text or ""
    return {
        "id": entry.id,
        "hmn_text": hmn,
        "vi_text": vi,
        "en_text": en,
        "phonetic": entry.phonetic or generate_hmong_phonetics(hmn),
        "pos_code": entry.pos_code or infer_pos_code(hmn, vi, en),
        "category": infer_phrase_category(hmn, vi, en),
        "note": entry.note or "",
        "source_type": entry.source_type or "user_contribution",
        "source_name": entry.source_name or "Học viên Trilinguo",
        "contributor_id": entry.contributor_id,
        "revision_count": int(entry.revision_count or 1),
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def _merge_translation_text(existing_val: Optional[str], new_val: Optional[str]) -> str:
    old_clean = (existing_val or "").strip()
    new_clean = (new_val or "").strip()
    if not old_clean:
        return new_clean
    if not new_clean:
        return old_clean
    old_parts = [normalize_text(p) for p in old_clean.split("/") if p.strip()]
    if normalize_text(new_clean) in old_parts:
        return old_clean
    return f"{old_clean} / {new_clean}"


def upsert_and_enrich_corpus_entry(
    db: Session,
    hmn_text: str,
    vi_text: str,
    en_text: str,
    note: str = "",
    source_type: str = "user_contribution",
    source_name: str = "Học viên Trilinguo",
    contributor_id: Optional[int] = None,
) -> Tuple[CorpusEntry, bool]:
    """
    Incremental Learning Core:
    - Looks up whether `hmn_text` (normalized) already exists in `corpus_entries`.
    - If found: enriches/merges `vi_text`, `en_text`, and `note`, and increments `revision_count`.
      Returns (entry, False) indicating an incremental update.
    - If not found: inserts a brand new `CorpusEntry`.
      Returns (entry, True) indicating a new entry learned.
    """
    clean_hmn = (hmn_text or "").strip()
    raw_vi = (vi_text or "").strip()
    raw_en = (en_text or "").strip()
    clean_vi, clean_en = auto_complete_missing_translation(clean_hmn, raw_vi, raw_en)
    clean_note = (note or "").strip()
    inferred_pos = infer_pos_code(clean_hmn, clean_vi, clean_en)
    norm_target = normalize_text(clean_hmn)

    existing_rows = db.query(CorpusEntry).all()
    matched = next(
        (r for r in existing_rows if normalize_text(r.hmn_text) == norm_target),
        None,
    )

    if matched:
        matched.vi_text = _merge_translation_text(matched.vi_text, clean_vi)
        matched.en_text = _merge_translation_text(matched.en_text, clean_en)
        if not matched.vi_text or not matched.en_text:
            matched.vi_text, matched.en_text = auto_complete_missing_translation(
                clean_hmn, matched.vi_text or "", matched.en_text or ""
            )
        if clean_note and clean_note not in (matched.note or ""):
            matched.note = f"{matched.note} · {clean_note}".strip(" ·") if matched.note else clean_note
        if not matched.phonetic:
            matched.phonetic = generate_hmong_phonetics(clean_hmn)
        if not matched.pos_code or matched.pos_code == "(nth) nthe":
            matched.pos_code = inferred_pos
        matched.revision_count = int(matched.revision_count or 1) + 1
        db.flush()
        return matched, False

    new_entry = CorpusEntry(
        hmn_text=clean_hmn,
        vi_text=clean_vi,
        en_text=clean_en,
        phonetic=generate_hmong_phonetics(clean_hmn),
        pos_code=inferred_pos,
        note=clean_note
        or (
            f"Đóng góp bởi {source_name}"
            if source_type == "user_contribution"
            else f"Học từ tài liệu {source_name}"
        ),
        source_type=source_type,
        source_name=source_name,
        contributor_id=contributor_id,
        revision_count=1,
    )
    db.add(new_entry)
    db.flush()
    return new_entry, True


@router.get("/entries")
def list_corpus_entries(
    source_type: Optional[str] = Query(default=None, description="all | user_contribution | admin_document"),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Returns all learned corpus entries + statistics from both User Contributions and Admin Documents.
    Used by Frontend to synchronize the live translation engine and display the Knowledge Base.
    """
    sync_dynamic_corpus_from_db(db)

    all_rows = (
        db.query(CorpusEntry)
        .order_by(CorpusEntry.updated_at.desc(), CorpusEntry.id.desc())
        .all()
    )
    doc_logs = (
        db.query(CorpusDocumentLog)
        .order_by(CorpusDocumentLog.created_at.desc(), CorpusDocumentLog.id.desc())
        .limit(30)
        .all()
    )

    user_contrib_count = sum(1 for r in all_rows if r.source_type == "user_contribution")
    admin_doc_count = sum(1 for r in all_rows if r.source_type == "admin_document")

    filtered = all_rows
    if source_type and source_type not in ("all", ""):
        filtered = [r for r in filtered if r.source_type == source_type]

    if search and search.strip():
        q = search.strip().lower()
        filtered = [
            r
            for r in filtered
            if q in (r.hmn_text or "").lower()
            or q in (r.vi_text or "").lower()
            or q in (r.en_text or "").lower()
            or q in (r.source_name or "").lower()
        ]

    serialized_items = [serialize_corpus_entry(r) for r in filtered]
    serialized_logs = [
        {
            "id": d.id,
            "filename": d.filename,
            "file_format": d.file_format,
            "total_lines": d.total_lines,
            "learned_count": d.learned_count,
            "inserted_count": d.learned_count,
            "updated_count": d.updated_count,
            "uploaded_by_email": d.uploaded_by_email,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in doc_logs
    ]

    return {
        "total": len(all_rows),
        "total_entries": len(all_rows),
        "user_contribution_count": user_contrib_count,
        "user_contributions_count": user_contrib_count,
        "admin_document_count": admin_doc_count,
        "admin_documents_count": admin_doc_count,
        "total_documents_uploaded": len(doc_logs),
        "entries": serialized_items,
        "items": serialized_items,
        "document_logs": serialized_logs,
    }


@router.post("/contribute")
def submit_user_contribution(
    payload: UserContributionCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Learner contribution endpoint:
    - Requires `hmn_text` (Hmong word/sentence).
    - Requires at least 1 of (`vi_text`, `en_text`) — cannot leave both empty.
    - Immediately trains/updates the global Trilinguo translation corpus.
    """
    clean_hmn = (payload.hmn_text or "").strip()
    clean_vi = (payload.vi_text or "").strip()
    clean_en = (payload.en_text or "").strip()
    clean_note = (payload.note or "").strip()

    if not clean_hmn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập từ hoặc câu Tiếng Hmong!",
        )
    if not clean_vi and not clean_en:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bắt buộc phải nhập ít nhất 1 trong 2 bản dịch (Tiếng Việt hoặc Tiếng Anh), không được để trống cả hai!",
        )

    contributor_name = (
        current_user.account_name
        if current_user and current_user.account_name
        else (current_user.email if current_user and current_user.email else "Học viên Cộng đồng")
    )
    contributor_id = current_user.id if current_user else None

    entry, is_new = upsert_and_enrich_corpus_entry(
        db=db,
        hmn_text=clean_hmn,
        vi_text=clean_vi,
        en_text=clean_en,
        note=clean_note,
        source_type="user_contribution",
        source_name=contributor_name,
        contributor_id=contributor_id,
    )
    db.commit()
    db.refresh(entry)
    sync_dynamic_corpus_from_db(db)

    action_msg = (
        f"Đã thêm mới '{clean_hmn}' vào Kho tri thức hệ thống!"
        if is_new
        else f"Từ/câu '{clean_hmn}' đã có sẵn và vừa được hệ thống tự động hợp nhất, bổ sung thêm bản dịch mới (Lần cập nhật #{entry.revision_count})!"
    )

    return {
        "status": "learned",
        "is_new": is_new,
        "message": action_msg,
        "entry": serialize_corpus_entry(entry),
    }


@router.post("/admin/upload-document")
def admin_upload_and_train_document(
    payload: AdminDocumentUploadRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin / Super Admin endpoint to upload a document (.csv, .tsv, .txt, .json, .md)
    and train/enrich the system-wide translation corpus automatically.
    """
    filename = (payload.filename or "tai_lieu_admin.txt").strip()
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"

    parsed_rows = []
    if payload.entries:
        for item in payload.entries:
            h = (item.hmn_text or "").strip()
            v = (item.vi_text or "").strip()
            e = (item.en_text or "").strip()
            n = (item.note or "").strip()
            if h and (v or e):
                parsed_rows.append({"hmn_text": h, "vi_text": v, "en_text": e, "note": n})

    if not parsed_rows and payload.file_base64:
        extracted_text = extract_text_from_binary_document(filename, payload.file_base64)
        if extracted_text:
            parsed_rows.extend(parse_document_content_to_entries(filename, extracted_text))

    if not parsed_rows and payload.content and payload.content.strip():
        parsed_rows.extend(parse_document_content_to_entries(filename, payload.content))

    if not parsed_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Không tìm thấy cặp câu/từ hợp lệ trong tài liệu. "
                "Đảm bảo mỗi dòng có Từ/Câu Tiếng Hmong và ít nhất 1 bản dịch (Tiếng Việt hoặc Tiếng Anh), "
                "phân tách bằng dấu '|', dấu phẩy ',', tab hoặc gạch ngang '-'."
            ),
        )

    learned_count = 0
    updated_count = 0
    processed_entries = []

    for row in parsed_rows:
        entry, is_new = upsert_and_enrich_corpus_entry(
            db=db,
            hmn_text=row["hmn_text"],
            vi_text=row.get("vi_text", ""),
            en_text=row.get("en_text", ""),
            note=row.get("note", ""),
            source_type="admin_document",
            source_name=filename,
            contributor_id=current_admin.id,
        )
        if is_new:
            learned_count += 1
        else:
            updated_count += 1
        processed_entries.append(entry)

    doc_log = CorpusDocumentLog(
        filename=filename,
        file_format=ext,
        total_lines=len(parsed_rows),
        learned_count=learned_count,
        updated_count=updated_count,
        uploaded_by_email=current_admin.email or current_admin.account_name,
    )
    db.add(doc_log)
    db.commit()
    sync_dynamic_corpus_from_db(db)

    total_corpus_size = db.query(CorpusEntry).count()

    return {
        "status": "trained",
        "filename": filename,
        "total_extracted": len(parsed_rows),
        "learned_count": learned_count,
        "inserted_count": learned_count,
        "updated_count": updated_count,
        "total_corpus_size": total_corpus_size,
        "message": (
            f"Hệ thống đã học thành công tài liệu '{filename}': "
            f"Thêm mới {learned_count} mục từ/câu và làm giàu/cập nhật {updated_count} mục từ có sẵn!"
        ),
        "entries": [serialize_corpus_entry(e) for e in processed_entries[:50]],
    }


@router.post("/admin/enrich-all")
def admin_enrich_all_corpus_entries(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin / Super Admin endpoint to scan all learned entries in `corpus_entries`,
    automatically synthesize any missing 3rd-language translation (VI <-> EN),
    compute RPA phonetics, and classify POS + Phrase Category so 100% of the corpus
    is complete for all Learner modules (Translator, Lookup, Common Phrases, Flashcards, Quizzes).
    """
    sync_dynamic_corpus_from_db(db)
    all_rows = db.query(CorpusEntry).all()
    enriched_count = 0

    for row in all_rows:
        changed = False
        new_vi, new_en = auto_complete_missing_translation(
            row.hmn_text or "", row.vi_text or "", row.en_text or ""
        )
        if new_vi and not (row.vi_text or "").strip():
            row.vi_text = new_vi
            changed = True
        if new_en and not (row.en_text or "").strip():
            row.en_text = new_en
            changed = True
        if not (row.phonetic or "").strip():
            row.phonetic = generate_hmong_phonetics(row.hmn_text or "")
            changed = True
        inferred_pos = infer_pos_code(row.hmn_text or "", row.vi_text or "", row.en_text or "")
        if not (row.pos_code or "").strip() or row.pos_code == "(nth) nthe":
            if inferred_pos != row.pos_code:
                row.pos_code = inferred_pos
                changed = True
        if changed:
            row.revision_count = int(row.revision_count or 1) + 1
            enriched_count += 1

    db.commit()
    sync_dynamic_corpus_from_db(db)

    return {
        "status": "enriched",
        "total_entries": len(all_rows),
        "enriched_count": enriched_count,
        "message": (
            f"Đã chuẩn hóa và lấp đầy dữ liệu ngôn ngữ 3 chiều (HMN - VI - EN, Phiên âm RPA, Loại từ & Chủ đề) "
            f"cho toàn bộ {len(all_rows)} mục trong Kho Tri Thức (cập nhật bổ sung {enriched_count} mục)!"
        ),
    }


@router.delete("/admin/entries/{entry_id}")
def admin_delete_corpus_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    target = db.query(CorpusEntry).filter(CorpusEntry.id == entry_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy mục từ trong Kho tri thức.",
        )
    hmn_label = target.hmn_text
    db.delete(target)
    db.commit()
    sync_dynamic_corpus_from_db(db)
    return {
        "status": "deleted",
        "deleted_id": entry_id,
        "message": f"Đã xóa mục từ '{hmn_label}' khỏi Kho tri thức hệ thống.",
    }
