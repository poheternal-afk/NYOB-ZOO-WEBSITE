"""
============================================================================
TRILINGUO / NYOB ZOO — MASTER DATABASE INITIALIZATION & SUPABASE AUTO-SETUP
(backend/setup_database.py)

Automatically creates, migrates, and seeds all 6 core tables on Supabase
PostgreSQL (or local SQLite fallback):
  1. users                 (Accounts, RBAC roles: user / admin / super_admin)
  2. learning_blocks       (Language pairs: vi_hmn, hmn_vi, en_hmn, hmn_en, vi_en, en_vi)
  3. personal_notebook     (Saved vocabulary, flashcards & quiz mastery metrics)
  4. translation_history   (3-way translation history per block)
  5. corpus_entries        (Community contributions & Admin document training corpus)
  6. corpus_document_logs  (Admin uploaded document training logs)

Can be invoked:
  - Automatically on backend startup / first request via `database.ensure_db_ready()`
  - Via API endpoint `POST /api/database/setup` or `GET /api/database/status`
  - Directly from CLI: `python backend/setup_database.py`
============================================================================
"""

from typing import Dict, Any
from sqlalchemy import text, func
from sqlalchemy.orm import Session

SUPER_ADMIN_EMAIL = "poheternal@gmail.com"


def run_schema_migrations(engine) -> None:
    """
    Ensures all required columns exist on existing tables (idempotent for
    both Supabase PostgreSQL and SQLite).
    """
    migration_statements = [
        "ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN accepted_terms BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE corpus_entries ADD COLUMN pos_code VARCHAR(60) DEFAULT '(nth) nthe'",
        "ALTER TABLE corpus_entries ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 1",
    ]
    for sql_stmt in migration_statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql_stmt))
        except Exception:
            # Column already exists
            pass


def seed_user_block_and_vocabulary(db: Session, user) -> None:
    """
    Ensures a User has an active LearningBlock, at least 12 starter NotebookItems,
    and 4 starter TranslationHistory rows so Flashcards (>=4), Quizzes (>=10),
    and Progress Dashboard metrics work immediately.
    """
    from models import LearningBlock, NotebookItem, TranslationHistory
    from services.translator import DICTIONARY, COMMON_PHRASES, POS_LABELS

    n_lang = (user.native_lang or "vi").strip().lower()
    t_lang = (user.target_lang or "hmn").strip().lower()
    if n_lang == t_lang:
        t_lang = "hmn" if n_lang != "hmn" else "vi"
    block_key = f"{n_lang}_{t_lang}"

    block = (
        db.query(LearningBlock)
        .filter(LearningBlock.user_id == user.id, LearningBlock.block_key == block_key)
        .first()
    )
    if not block:
        block = LearningBlock(
            user_id=user.id,
            block_key=block_key,
            native_lang=n_lang,
            target_lang=t_lang,
            total_quiz_questions=30 if user.role in ("super_admin", "admin") else 0,
            total_quiz_correct=27 if user.role in ("super_admin", "admin") else 0,
        )
        db.add(block)
        db.flush()

    existing_nb_count = (
        db.query(NotebookItem)
        .filter(NotebookItem.user_id == user.id, NotebookItem.block_key == block_key)
        .count()
    )
    if existing_nb_count == 0:
        for idx, d in enumerate(DICTIONARY[:12]):
            pos_code = POS_LABELS.get(d.get("pos", "y"), POS_LABELS["y"])["code"]
            is_demo_mastered = idx < 3 and user.role in ("super_admin", "admin")
            db.add(
                NotebookItem(
                    user_id=user.id,
                    block_key=block_key,
                    source_text=d.get(n_lang) or d["vi"],
                    target_text=d.get(t_lang) or d["hmn"],
                    hmn_text=d["hmn"],
                    vi_text=d["vi"],
                    en_text=d["en"],
                    phonetic=d.get("phonetic", ""),
                    pos_code=pos_code,
                    example_sentence=f"{d.get('exampleHmn', '')} — {d.get('exampleVi', '')}",
                    quiz_attempts=11 if is_demo_mastered else 0,
                    quiz_correct=10 if is_demo_mastered else 0,
                    remembered=is_demo_mastered,
                )
            )

    existing_hist_count = (
        db.query(TranslationHistory)
        .filter(
            TranslationHistory.user_id == user.id,
            TranslationHistory.block_key == block_key,
        )
        .count()
    )
    if existing_hist_count == 0:
        for p in COMMON_PHRASES[:4]:
            db.add(
                TranslationHistory(
                    user_id=user.id,
                    block_key=block_key,
                    source_lang=n_lang,
                    target_lang=t_lang,
                    source_text=p.get(n_lang) or p["vi"],
                    translated_text=p.get(t_lang) or p["hmn"],
                    hmn_text=p["hmn"],
                    vi_text=p["vi"],
                    en_text=p["en"],
                    phonetic=p.get("phonetic", ""),
                    pos_code="(nth) nthe",
                    grammar_note=p.get("note", ""),
                )
            )


def seed_default_users_and_corpus(db: Session) -> Dict[str, int]:
    """
    Guarantees that:
    1. Super Admin (`poheternal@gmail.com`) exists with `role = 'super_admin'` and `is_active = True`.
    2. Initial sample accounts exist so Admin Dashboard & Learner views work out-of-the-box.
    3. Initial community & admin corpus entries exist in `corpus_entries`.
    """
    from models import User, CorpusEntry, CorpusDocumentLog
    from services.translator import generate_hmong_phonetics, infer_pos_code

    default_accounts = [
        {
            "account_name": "Poh Eternal (Super Admin)",
            "email": SUPER_ADMIN_EMAIL,
            "phone": "0901234567",
            "native_lang": "vi",
            "target_lang": "hmn",
            "role": "super_admin",
            "is_active": True,
        },
        {
            "account_name": "Giàng A Páo (Tả Van)",
            "email": "giangapao.tavan@gmail.com",
            "phone": "0987654321",
            "native_lang": "hmn",
            "target_lang": "en",
            "role": "admin",
            "is_active": True,
        },
        {
            "account_name": "Nguyễn Minh Anh",
            "email": "minhanh.trekking@gmail.com",
            "phone": "0912345678",
            "native_lang": "vi",
            "target_lang": "hmn",
            "role": "user",
            "is_active": True,
        },
        {
            "account_name": "Sùng Thị Mai (Homestay)",
            "email": "sungthimai.sapa@gmail.com",
            "phone": "0934567890",
            "native_lang": "hmn",
            "target_lang": "vi",
            "role": "user",
            "is_active": True,
        },
        {
            "account_name": "Liam Henderson",
            "email": "liam.henderson.uk@gmail.com",
            "phone": "0978112233",
            "native_lang": "en",
            "target_lang": "hmn",
            "role": "user",
            "is_active": True,
        },
    ]

    created_users = 0
    super_admin_user = None

    for acc in default_accounts:
        email_low = acc["email"].strip().lower()
        existing = (
            db.query(User)
            .filter(func.lower(User.email) == email_low)
            .first()
        )
        if not existing and acc.get("phone"):
            existing = db.query(User).filter(User.phone == acc["phone"]).first()

        if not existing:
            existing = User(
                account_name=acc["account_name"],
                email=email_low,
                phone=acc["phone"],
                auth_provider="email",
                native_lang=acc["native_lang"],
                target_lang=acc["target_lang"],
                role=acc["role"],
                is_active=acc["is_active"],
                accepted_terms=True,
                is_verified=True,
            )
            db.add(existing)
            db.flush()
            created_users += 1
        else:
            if email_low == SUPER_ADMIN_EMAIL:
                existing.role = "super_admin"
                existing.is_active = True

        if email_low == SUPER_ADMIN_EMAIL:
            super_admin_user = existing

        seed_user_block_and_vocabulary(db, existing)

    # Seed starter Corpus Entries if corpus_entries table is empty
    created_corpus = 0
    if db.query(CorpusEntry).count() == 0:
        starter_corpus = [
            {
                "hmn_text": "Zoo siab txais tos koj tuaj Tả Van",
                "vi_text": "Chào mừng bạn đến thăm bản Tả Van",
                "en_text": "Welcome to Ta Van village",
                "note": "Câu chào đón khách du lịch cộng đồng tại bản Tả Van",
                "source_type": "user_contribution",
                "source_name": "Giàng A Páo (Tả Van)",
            },
            {
                "hmn_text": "Kuv tsev neeg ua homestay nyob ze tus dej",
                "vi_text": "Gia đình tôi làm homestay ở gần bờ suối",
                "en_text": "My family runs a homestay near the stream",
                "note": "Giới thiệu vị trí homestay cho du khách",
                "source_type": "user_contribution",
                "source_name": "Sùng Thị Mai (Homestay)",
            },
            {
                "hmn_text": "Cov paj ntaub Hmoob no xaws los ntawm tes",
                "vi_text": "Những tấm thổ cẩm người Mông này được thêu hoàn toàn bằng tay",
                "en_text": "These Hmong brocade textiles are completely handmade",
                "note": "Giới thiệu nghề thêu thổ cẩm truyền thống",
                "source_type": "admin_document",
                "source_name": "giao_trinh_du_lich_ta_van_2026.docx",
            },
            {
                "hmn_text": "Hnub no huab cua txias thiab cua tshuab zoo",
                "vi_text": "Hôm nay thời tiết mát mẻ và gió thổi rất dễ chịu",
                "en_text": "Today the weather is cool with a pleasant breeze",
                "note": "Giao tiếp hàng ngày về thời tiết vùng cao",
                "source_type": "admin_document",
                "source_name": "tu_dien_giao_tiep_hmong_viet_anh.pdf",
            },
            {
                "hmn_text": "Thov koj qhia kuv hais lo lus Hmoob no",
                "vi_text": "Xin bạn hãy dạy tôi cách phát âm từ tiếng Mông này",
                "en_text": "Please teach me how to pronounce this Hmong word",
                "note": "Mẫu câu dành cho người học tiếng Mông",
                "source_type": "user_contribution",
                "source_name": "Nguyễn Minh Anh",
            },
        ]

        for item in starter_corpus:
            hmn = item["hmn_text"]
            vi = item["vi_text"]
            en = item["en_text"]
            db.add(
                CorpusEntry(
                    hmn_text=hmn,
                    vi_text=vi,
                    en_text=en,
                    phonetic=generate_hmong_phonetics(hmn),
                    pos_code=infer_pos_code(hmn, vi, en),
                    note=item["note"],
                    source_type=item["source_type"],
                    source_name=item["source_name"],
                    contributor_id=super_admin_user.id if super_admin_user else None,
                    revision_count=1,
                )
            )
            created_corpus += 1

        if db.query(CorpusDocumentLog).count() == 0:
            db.add(
                CorpusDocumentLog(
                    filename="giao_trinh_du_lich_ta_van_2026.docx",
                    file_format="docx",
                    total_lines=25,
                    learned_count=22,
                    updated_count=3,
                    uploaded_by_email=SUPER_ADMIN_EMAIL,
                )
            )

    db.commit()
    return {
        "created_users": created_users,
        "created_corpus": created_corpus,
        "total_users": db.query(User).count(),
        "total_corpus": db.query(CorpusEntry).count(),
    }


def initialize_and_seed_database(engine, session_factory) -> Dict[str, Any]:
    """
    Master entrypoint: creates all tables, applies migrations, seeds initial data,
    and synchronizes the live translation corpus.
    """
    from database import Base
    import models  # noqa: F401
    from services.translator import sync_dynamic_corpus_from_db

    Base.metadata.create_all(bind=engine)
    run_schema_migrations(engine)

    db = session_factory()
    try:
        summary = seed_default_users_and_corpus(db)
        sync_dynamic_corpus_from_db(db)
        dialect = engine.dialect.name
        return {
            "status": "ready",
            "database_engine": "Supabase PostgreSQL (Cloud 24/7)" if "postgres" in dialect else "SQLite Local/Serverless",
            "dialect": dialect,
            **summary,
        }
    finally:
        db.close()


if __name__ == "__main__":
    from database import engine, SessionLocal, get_active_database_info

    print("=================================================================")
    print("🚀 TRILINGUO / NYOB ZOO — DANG KHOI TAO HE THONG DATABASE...")
    print("=================================================================")
    result = initialize_and_seed_database(engine, SessionLocal)
    info = get_active_database_info()
    print(f"✅ Engine ket noi : {result['database_engine']} ({info['masked_url']})")
    print(f"✅ Tong so Users  : {result['total_users']} tai khoan (Super Admin: {SUPER_ADMIN_EMAIL})")
    print(f"✅ Kho Tri Thuc   : {result['total_corpus']} muc tu vung & mau cau da hoc")
    print("🎉 Hoan tat! Database da san sang 100% cho Frontend & Backend.")
