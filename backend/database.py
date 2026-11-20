"""
============================================================================
TRILINGUO / NYOB ZOO — DATABASE ENGINE & SUPABASE 24/7 SESSION MANAGEMENT
(backend/database.py)
Supports Supabase PostgreSQL & SQLite with automatic SSL configuration,
connection pooling, URL quote sanitization, and automatic table + seed setup.
============================================================================
"""

import os
import re
import tempfile
from typing import Dict, Any
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings


def _build_sqlite_tmp_url() -> str:
    if os.getenv("VERCEL"):
        tmp_db = os.path.join(tempfile.gettempdir(), "trilinguo_production.db").replace("\\", "/")
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./trilinguo_production.db"


def _sanitize_database_url(raw_value: str) -> str:
    cleaned = (raw_value or "").strip()
    if cleaned.upper().startswith("DATABASE_URL="):
        cleaned = cleaned.split("=", 1)[1].strip()
    cleaned = cleaned.strip("\"' \t\r\n")
    if cleaned.startswith("postgres://"):
        cleaned = cleaned.replace("postgres://", "postgresql://", 1)

    # Automatically enforce sslmode=require for Supabase Cloud PostgreSQL if not specified
    if ("supabase.co" in cleaned or "supabase.com" in cleaned) and "sslmode=" not in cleaned:
        sep = "&" if "?" in cleaned else "?"
        cleaned = f"{cleaned}{sep}sslmode=require"

    if os.getenv("VERCEL") and (not cleaned or cleaned.startswith("sqlite")):
        return _build_sqlite_tmp_url()
    return cleaned or _build_sqlite_tmp_url()


db_url = _sanitize_database_url(settings.DATABASE_URL)
_active_db_url = db_url


def _create_safe_engine(target_url: str):
    global _active_db_url
    try:
        is_sqlite = target_url.startswith("sqlite")
        if is_sqlite:
            _active_db_url = target_url
            return create_engine(
                target_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
        _active_db_url = target_url
        return create_engine(
            target_url,
            connect_args={"connect_timeout": 10},
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
        )
    except Exception as exc:
        print(f"[Trilinguo DB Engine Warning] Invalid DATABASE_URL ({exc}). Falling back to SQLite.")
        fallback_url = _build_sqlite_tmp_url()
        _active_db_url = fallback_url
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )


engine = _create_safe_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_db_initialized = False


def get_active_database_info() -> Dict[str, Any]:
    masked = re.sub(r":([^:@/]+)@", ":****@", _active_db_url or "")
    is_supabase = "supabase.co" in (_active_db_url or "") or "supabase.com" in (_active_db_url or "")
    is_postgres = (_active_db_url or "").startswith("postgresql")
    return {
        "is_supabase": is_supabase,
        "is_postgres": is_postgres,
        "engine_type": "Supabase PostgreSQL 24/7" if is_supabase else ("PostgreSQL" if is_postgres else "SQLite Fallback"),
        "masked_url": masked,
        "initialized": _db_initialized,
    }


def ensure_db_ready(force: bool = False) -> Dict[str, Any]:
    """
    Initializes all 6 database tables, applies migrations, and seeds initial
    Super Admin, learners, and corpus data via `setup_database.initialize_and_seed_database`.
    If primary PostgreSQL connection fails at runtime, seamlessly falls back to SQLite.
    """
    global _db_initialized, engine, SessionLocal, _active_db_url
    if _db_initialized and not force:
        return get_active_database_info()

    from setup_database import initialize_and_seed_database

    try:
        summary = initialize_and_seed_database(engine, SessionLocal)
        _db_initialized = True
        return {**get_active_database_info(), **summary}
    except Exception as exc:
        print(f"[Trilinguo DB Runtime Warning] Primary DB connection failed ({exc}). Switching to SQLite fallback.")
        try:
            fallback_url = _build_sqlite_tmp_url()
            _active_db_url = fallback_url
            engine = create_engine(
                fallback_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
            SessionLocal.configure(bind=engine)
            summary = initialize_and_seed_database(engine, SessionLocal)
            _db_initialized = True
            return {**get_active_database_info(), **summary}
        except Exception as inner_exc:
            print(f"[Trilinguo DB Fallback Warning] {inner_exc}")
            return get_active_database_info()


def get_db():
    """FastAPI dependency providing a transactional database session."""
    ensure_db_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
