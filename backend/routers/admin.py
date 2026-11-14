"""
============================================================================
TRILINGUO / NYOB ZOO — ADMIN PORTAL & RBAC ANALYTICS ROUTER
(routers/admin.py)
Strictly protected by Depends(get_current_admin).
Enforces immutable Super Admin privileges for poheternal@gmail.com.
============================================================================
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, LearningBlock, NotebookItem, TranslationHistory
from schemas import AdminUserUpdateRequest, AdminRoleUpdateRequest
from dependencies import (
    get_current_admin,
    make_block_key,
    ensure_learning_block,
    SUPER_ADMIN_EMAIL,
    is_super_admin_email,
    enforce_super_admin_rule,
)
from services.translator import DICTIONARY, COMMON_PHRASES, POS_LABELS

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & RBAC"])

LANGUAGE_PAIR_KEYS = [
    ("vi_hmn", "Việt (Kinh) → Hmong", "vi", "hmn"),
    ("hmn_vi", "Hmong → Việt (Kinh)", "hmn", "vi"),
    ("en_hmn", "Anh (English) → Hmong", "en", "hmn"),
    ("hmn_en", "Hmong → Anh (English)", "hmn", "en"),
    ("en_vi", "Anh (English) → Việt (Kinh)", "en", "vi"),
    ("vi_en", "Việt (Kinh) → Anh (English)", "vi", "en"),
]


def is_word_mastered(item: NotebookItem) -> bool:
    attempts = int(item.quiz_attempts or 0)
    correct = int(item.quiz_correct or 0)
    return attempts >= 10 and (correct / attempts) > 0.80


def seed_platform_sample_learners_if_needed(db: Session) -> None:
    """
    Ensures the platform has a rich set of initial learners across all 6 language pairs
    so the Admin Analytics Dashboard, User Management, and Learning Progress views
    display comprehensive data out-of-the-box.
    """
    total_count = db.query(User).count()
    if total_count >= 6:
        return

    # Ensure Super Admin account exists
    super_admin = (
        db.query(User).filter(User.email == SUPER_ADMIN_EMAIL).first()
    )
    if not super_admin:
        super_admin = User(
            account_name="Poh Eternal (Super Admin)",
            email=SUPER_ADMIN_EMAIL,
            phone="0901234567",
            auth_provider="google",
            native_lang="vi",
            target_lang="hmn",
            role="super_admin",
            is_active=True,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
    else:
        enforce_super_admin_rule(db, super_admin)

    sample_users = [
        {
            "account_name": "Giàng A Páo (Tả Van)",
            "email": "giangapao.tavan@gmail.com",
            "phone": "0987654321",
            "native_lang": "hmn",
            "target_lang": "en",
            "role": "admin",
            "is_active": True,
            "word_count": 12,
            "mastered_count": 5,
            "quiz_q": 60,
            "quiz_c": 54,
        },
        {
            "account_name": "Nguyễn Minh Anh",
            "email": "minhanh.trekking@gmail.com",
            "phone": "0912345678",
            "native_lang": "vi",
            "target_lang": "hmn",
            "role": "user",
            "is_active": True,
            "word_count": 10,
            "mastered_count": 4,
            "quiz_q": 50,
            "quiz_c": 44,
        },
        {
            "account_name": "Sùng Thị Mai (Homestay)",
            "email": "sungthimai.sapa@gmail.com",
            "phone": "0934567890",
            "native_lang": "hmn",
            "target_lang": "vi",
            "role": "user",
            "is_active": True,
            "word_count": 11,
            "mastered_count": 6,
            "quiz_q": 70,
            "quiz_c": 63,
        },
        {
            "account_name": "Liam Henderson",
            "email": "liam.henderson.uk@gmail.com",
            "phone": "0978112233",
            "native_lang": "en",
            "target_lang": "hmn",
            "role": "user",
            "is_active": True,
            "word_count": 8,
            "mastered_count": 2,
            "quiz_q": 30,
            "quiz_c": 25,
        },
        {
            "account_name": "Trần Quốc Bảo",
            "email": "quocbao.dulich@gmail.com",
            "phone": "0965432109",
            "native_lang": "vi",
            "target_lang": "en",
            "role": "user",
            "is_active": True,
            "word_count": 7,
            "mastered_count": 1,
            "quiz_q": 20,
            "quiz_c": 16,
        },
        {
            "account_name": "Claire Dubois",
            "email": "claire.traveler@gmail.com",
            "phone": "0944556677",
            "native_lang": "en",
            "target_lang": "vi",
            "role": "user",
            "is_active": False,
            "word_count": 5,
            "mastered_count": 0,
            "quiz_q": 10,
            "quiz_c": 7,
        },
    ]

    for spec in sample_users:
        exists = db.query(User).filter(User.email == spec["email"]).first()
        if exists:
            continue
        u = User(
            account_name=spec["account_name"],
            email=spec["email"],
            phone=spec["phone"],
            auth_provider="google",
            native_lang=spec["native_lang"],
            target_lang=spec["target_lang"],
            role=spec["role"],
            is_active=spec["is_active"],
            accepted_terms=True,
            is_verified=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)

        b_key = make_block_key(u.native_lang, u.target_lang)
        lb = LearningBlock(
            user_id=u.id,
            block_key=b_key,
            native_lang=u.native_lang,
            target_lang=u.target_lang,
            total_quiz_questions=spec["quiz_q"],
            total_quiz_correct=spec["quiz_c"],
        )
        db.add(lb)

        for idx, d in enumerate(DICTIONARY[: spec["word_count"]]):
            pos_code = POS_LABELS.get(d.get("pos", "y"), POS_LABELS["y"])["code"]
            is_mast = idx < spec["mastered_count"]
            nb = NotebookItem(
                user_id=u.id,
                block_key=b_key,
                source_text=d.get(u.native_lang) or d["vi"],
                target_text=d.get(u.target_lang) or d["hmn"],
                hmn_text=d["hmn"],
                vi_text=d["vi"],
                en_text=d["en"],
                phonetic=d.get("phonetic", ""),
                pos_code=pos_code,
                example_sentence=f"{d.get('exampleHmn', '')} — {d.get('exampleVi', '')}",
                quiz_attempts=12 if is_mast else 4,
                quiz_correct=11 if is_mast else 3,
                remembered=is_mast,
            )
            db.add(nb)

        for p in COMMON_PHRASES[:3]:
            hist = TranslationHistory(
                user_id=u.id,
                block_key=b_key,
                source_lang=u.native_lang,
                target_lang=u.target_lang,
                source_text=p.get(u.native_lang) or p["vi"],
                translated_text=p.get(u.target_lang) or p["hmn"],
                hmn_text=p["hmn"],
                vi_text=p["vi"],
                en_text=p["en"],
                phonetic=p.get("phonetic", ""),
                pos_code="(nth) nthe",
                grammar_note=p.get("note", ""),
            )
            db.add(hist)

        db.commit()


def compute_user_summary_dict(db: Session, user: User) -> dict:
    """
    Computes personal details + aggregated learning progress across all LearningBlocks for a User.
    """
    enforce_super_admin_rule(db, user)

    blocks = (
        db.query(LearningBlock).filter(LearningBlock.user_id == user.id).all()
    )
    notebook_items = (
        db.query(NotebookItem).filter(NotebookItem.user_id == user.id).all()
    )
    translations_count = (
        db.query(TranslationHistory)
        .filter(TranslationHistory.user_id == user.id)
        .count()
    )

    total_saved = len(notebook_items)
    mastered_count = sum(1 for item in notebook_items if is_word_mastered(item))

    total_quiz_q = sum(int(b.total_quiz_questions or 0) for b in blocks)
    total_quiz_c = sum(int(b.total_quiz_correct or 0) for b in blocks)
    if total_quiz_q == 0 and notebook_items:
        total_quiz_q = sum(int(w.quiz_attempts or 0) for w in notebook_items)
        total_quiz_c = sum(int(w.quiz_correct or 0) for w in notebook_items)

    quiz_accuracy = (
        round((total_quiz_c / total_quiz_q) * 100.0, 1) if total_quiz_q > 0 else 0.0
    )

    role_val = (
        "super_admin"
        if is_super_admin_email(user.email)
        else (getattr(user, "role", None) or "user")
    )
    is_active_val = (
        True
        if is_super_admin_email(user.email)
        else bool(getattr(user, "is_active", True))
    )

    return {
        "id": user.id,
        "username": user.account_name,
        "account_name": user.account_name,
        "email": user.email or "",
        "phone": user.phone or "",
        "avatar_url": user.avatar_url or "",
        "auth_provider": user.auth_provider,
        "native_lang": user.native_lang,
        "active_target_lang": user.target_lang,
        "target_lang": user.target_lang,
        "learning_block": make_block_key(user.native_lang, user.target_lang),
        "role": role_val,
        "is_super_admin": is_super_admin_email(user.email) or role_val == "super_admin",
        "is_active": is_active_val,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "blocks_count": max(len(blocks), 1),
        "total_translations": translations_count,
        "total_saved_words": total_saved,
        "mastered_words": mastered_count,
        "total_quiz_questions": total_quiz_q,
        "total_quiz_correct": total_quiz_c,
        "quiz_accuracy": quiz_accuracy,
    }


# ----------------------------------------------------------------------------
# 1. GET /api/admin/dashboard-stats (Platform-wide KPIs & Charts)
# ----------------------------------------------------------------------------

@router.get("/dashboard-stats")
def get_admin_dashboard_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    seed_platform_sample_learners_if_needed(db)

    all_users = db.query(User).all()
    for u in all_users:
        enforce_super_admin_rule(db, u)

    total_users = len(all_users)
    active_users_count = sum(
        1 for u in all_users if bool(getattr(u, "is_active", True))
    )
    total_admins = sum(
        1
        for u in all_users
        if is_super_admin_email(u.email)
        or getattr(u, "role", "user") in ("admin", "super_admin")
    )

    total_translations = db.query(TranslationHistory).count()
    all_notebook_items = db.query(NotebookItem).all()
    total_saved_words = len(all_notebook_items)
    total_mastered_words = sum(
        1 for item in all_notebook_items if is_word_mastered(item)
    )

    all_blocks = db.query(LearningBlock).all()
    sum_quiz_q = sum(int(b.total_quiz_questions or 0) for b in all_blocks)
    sum_quiz_c = sum(int(b.total_quiz_correct or 0) for b in all_blocks)
    if sum_quiz_q == 0 and all_notebook_items:
        sum_quiz_q = sum(int(w.quiz_attempts or 0) for w in all_notebook_items)
        sum_quiz_c = sum(int(w.quiz_correct or 0) for w in all_notebook_items)

    platform_quiz_accuracy = (
        round((sum_quiz_c / sum_quiz_q) * 100.0, 1) if sum_quiz_q > 0 else 0.0
    )

    # Language pair distribution across all users
    pair_counts = {k: 0 for k, _, _, _ in LANGUAGE_PAIR_KEYS}
    for u in all_users:
        key = make_block_key(u.native_lang, u.target_lang)
        pair_counts[key] = pair_counts.get(key, 0) + 1

    language_pair_distribution = []
    for key, label, n_lang, t_lang in LANGUAGE_PAIR_KEYS:
        cnt = pair_counts.get(key, 0)
        pct = round((cnt / total_users) * 100.0, 1) if total_users > 0 else 0.0
        language_pair_distribution.append(
            {
                "block_key": key,
                "label": label,
                "native_lang": n_lang,
                "target_lang": t_lang,
                "count": cnt,
                "percentage": pct,
            }
        )

    user_summaries = [compute_user_summary_dict(db, u) for u in all_users]
    top_learners = sorted(
        user_summaries,
        key=lambda x: (
            x["mastered_words"],
            x["total_saved_words"],
            x["quiz_accuracy"],
        ),
        reverse=True,
    )[:5]

    return {
        "total_users": total_users,
        "active_users_count": active_users_count,
        "total_admins": total_admins,
        "total_translations": total_translations,
        "total_saved_words": total_saved_words,
        "total_mastered_words": total_mastered_words,
        "platform_quiz_accuracy": platform_quiz_accuracy,
        "language_pair_distribution": language_pair_distribution,
        "language_pair_counts": pair_counts,
        "top_learners": top_learners,
    }


# ----------------------------------------------------------------------------
# 2. GET /api/admin/users (Search, Filter & Full User Progress List)
# ----------------------------------------------------------------------------

@router.get("/users")
def list_all_users_for_admin(
    search: Optional[str] = Query(default=None, description="Search by name, email, or phone"),
    role: Optional[str] = Query(default=None, description="Filter by role: all, super_admin, admin, user"),
    lang_pair: Optional[str] = Query(default=None, description="Filter by language block e.g. vi_hmn"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    seed_platform_sample_learners_if_needed(db)

    query = db.query(User)
    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.account_name.ilike(kw),
                User.email.ilike(kw),
                User.phone.ilike(kw),
            )
        )

    users = query.order_by(User.id.asc()).all()
    results = []
    for u in users:
        summary = compute_user_summary_dict(db, u)
        if role and role not in ("all", ""):
            if summary["role"] != role:
                continue
        if lang_pair and lang_pair not in ("all", ""):
            if summary["learning_block"] != lang_pair:
                continue
        results.append(summary)

    # Put super_admin first, then admin, then user
    role_priority = {"super_admin": 0, "admin": 1, "user": 2}
    results.sort(key=lambda item: (role_priority.get(item["role"], 3), item["id"]))

    return {"items": results, "total": len(results)}


# ----------------------------------------------------------------------------
# 3. GET /api/admin/users/{user_id}/progress (Detailed Per-User Learning Modal)
# ----------------------------------------------------------------------------

@router.get("/users/{user_id}/progress")
def get_single_user_detailed_progress(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng này.",
        )

    ensure_learning_block(db, user)
    blocks = (
        db.query(LearningBlock).filter(LearningBlock.user_id == user.id).all()
    )
    all_words = (
        db.query(NotebookItem)
        .filter(NotebookItem.user_id == user.id)
        .order_by(NotebookItem.id.desc())
        .all()
    )
    recent_history = (
        db.query(TranslationHistory)
        .filter(TranslationHistory.user_id == user.id)
        .order_by(TranslationHistory.id.desc())
        .limit(15)
        .all()
    )

    blocks_detail = []
    for b in blocks:
        b_words = [w for w in all_words if w.block_key == b.block_key]
        b_mast = sum(1 for w in b_words if is_word_mastered(w))
        b_hist_count = (
            db.query(TranslationHistory)
            .filter(
                TranslationHistory.user_id == user.id,
                TranslationHistory.block_key == b.block_key,
            )
            .count()
        )
        tq = int(b.total_quiz_questions or 0)
        tc = int(b.total_quiz_correct or 0)
        if tq == 0 and b_words:
            tq = sum(int(w.quiz_attempts or 0) for w in b_words)
            tc = sum(int(w.quiz_correct or 0) for w in b_words)
        acc = round((tc / tq) * 100.0, 1) if tq > 0 else 0.0

        blocks_detail.append(
            {
                "block_key": b.block_key,
                "native_lang": b.native_lang,
                "target_lang": b.target_lang,
                "total_saved_words": len(b_words),
                "mastered_words": b_mast,
                "total_translations": b_hist_count,
                "total_quiz_questions": tq,
                "total_quiz_correct": tc,
                "quiz_accuracy": acc,
            }
        )

    return {
        "user": compute_user_summary_dict(db, user),
        "learning_blocks": blocks_detail,
        "notebook_items": [
            {
                "id": w.id,
                "block_key": w.block_key,
                "source_text": w.source_text,
                "target_text": w.target_text,
                "hmn_text": w.hmn_text,
                "vi_text": w.vi_text,
                "en_text": w.en_text,
                "phonetic": w.phonetic,
                "pos_code": w.pos_code,
                "quiz_attempts": w.quiz_attempts,
                "quiz_correct": w.quiz_correct,
                "remembered": w.remembered,
                "is_mastered": is_word_mastered(w),
            }
            for w in all_words
        ],
        "recent_history": [
            {
                "id": h.id,
                "block_key": h.block_key,
                "source_lang": h.source_lang,
                "target_lang": h.target_lang,
                "source_text": h.source_text,
                "translated_text": h.translated_text,
                "phonetic": h.phonetic,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in recent_history
        ],
    }


# ----------------------------------------------------------------------------
# 4. PUT /api/admin/users/{user_id} (Edit User Profile & Active Lock Status)
# ----------------------------------------------------------------------------

@router.put("/users/{user_id}")
def admin_update_user_info(
    user_id: int,
    payload: AdminUserUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng.",
        )

    is_target_super = is_super_admin_email(user.email)

    # Protect poheternal@gmail.com from being deactivated or losing its super_admin email
    if is_target_super:
        if payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Không thể khóa tài khoản Super Admin tối cao ({SUPER_ADMIN_EMAIL})!",
            )
        if payload.email and payload.email.strip().lower() != SUPER_ADMIN_EMAIL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Không thể thay đổi địa chỉ Gmail của Super Admin ({SUPER_ADMIN_EMAIL})!",
            )

    new_name = payload.username or payload.account_name
    if new_name and new_name.strip():
        user.account_name = new_name.strip()

    if payload.email is not None and not is_target_super:
        clean_email = payload.email.strip().lower()
        if clean_email:
            conflict = (
                db.query(User)
                .filter(User.email == clean_email, User.id != user.id)
                .first()
            )
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Địa chỉ Gmail này đã thuộc về một tài khoản khác.",
                )
            user.email = clean_email

    if payload.phone is not None:
        clean_phone = payload.phone.strip()
        if clean_phone:
            conflict = (
                db.query(User)
                .filter(User.phone == clean_phone, User.id != user.id)
                .first()
            )
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Số điện thoại này đã thuộc về một tài khoản khác.",
                )
            user.phone = clean_phone
        else:
            user.phone = None

    new_native = payload.native_lang or user.native_lang
    new_target = payload.active_target_lang or payload.target_lang or user.target_lang
    if new_native == new_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngôn ngữ 'Tôi là' và 'Tôi muốn học' phải khác nhau!",
        )
    user.native_lang = new_native
    user.target_lang = new_target

    if payload.is_active is not None and not is_target_super:
        user.is_active = bool(payload.is_active)

    enforce_super_admin_rule(db, user)
    db.commit()
    db.refresh(user)
    ensure_learning_block(db, user)

    return {
        "message": "Đã cập nhật thông tin người dùng thành công!",
        "user": compute_user_summary_dict(db, user),
    }


# ----------------------------------------------------------------------------
# 5. PATCH /api/admin/users/{user_id}/role (Promote/Demote Role with Super Admin Lock)
# ----------------------------------------------------------------------------

@router.patch("/users/{user_id}/role")
def admin_change_user_role(
    user_id: int,
    payload: AdminRoleUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng.",
        )

    if is_super_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Không ai có quyền hạ quyền hoặc thay đổi vai trò của tài khoản tối cao {SUPER_ADMIN_EMAIL}!",
        )

    new_role = payload.role.strip().lower()
    if new_role not in ("user", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể phân quyền 'user' hoặc 'admin'. Quyền 'super_admin' chỉ dành riêng cho poheternal@gmail.com.",
        )

    user.role = new_role
    db.commit()
    db.refresh(user)

    return {
        "message": f"Đã cập nhật quyền của {user.account_name} thành '{new_role.upper()}'!",
        "user": compute_user_summary_dict(db, user),
    }


# ----------------------------------------------------------------------------
# 6. DELETE /api/admin/users/{user_id} (Delete User Account with Super Admin Protection)
# ----------------------------------------------------------------------------

@router.delete("/users/{user_id}")
def admin_delete_user_account(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng.",
        )

    if is_super_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tuyệt đối không thể xóa tài khoản Super Admin tối cao ({SUPER_ADMIN_EMAIL})!",
        )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự xóa tài khoản quản trị viên đang đăng nhập của chính mình!",
        )

    deleted_name = user.account_name
    db.delete(user)
    db.commit()

    return {
        "message": f"Đã xóa vĩnh viễn tài khoản '{deleted_name}' và dữ liệu học tập liên quan.",
        "deleted_user_id": user_id,
    }
