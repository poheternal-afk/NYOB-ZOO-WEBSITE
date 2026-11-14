"""
============================================================================
TRILINGUO / NYOB ZOO — DATABASE ENGINE & SESSION MANAGEMENT (database.py)
Supports Supabase PostgreSQL & SQLite with automatic connection pooling
and serverless /tmp fallback safety.
============================================================================
"""

import os
import tempfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

db_url = (settings.DATABASE_URL or "").strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)


def _build_sqlite_tmp_url() -> str:
    tmp_db = os.path.join(tempfile.gettempdir(), "trilinguo_production.db").replace("\\", "/")
    return f"sqlite:///{tmp_db}"


# If deployed on read-only serverless (e.g. Vercel) without a cloud DATABASE_URL set yet,
# store SQLite in /tmp so writes never fail.
if os.getenv("VERCEL") and (not db_url or db_url.startswith("sqlite")):
    db_url = _build_sqlite_tmp_url()


def _create_verified_engine(target_url: str):
    is_sqlite = target_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {"connect_timeout": 10}
    eng = create_engine(
        target_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )
    if not is_sqlite:
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception as exc:
            print(f"[Trilinguo DB Warning] Could not connect to primary DATABASE_URL ({exc}). Falling back to SQLite.")
            fallback_url = _build_sqlite_tmp_url()
            eng = create_engine(
                fallback_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
    return eng


engine = _create_verified_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
