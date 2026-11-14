"""
============================================================================
TRILINGUO / NYOB ZOO — DATABASE ENGINE & SESSION MANAGEMENT (database.py)
Supports Supabase PostgreSQL & SQLite with automatic connection pooling,
URL quote sanitization, and lazy serverless initialization.
============================================================================
"""

import os
import tempfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings


def _build_sqlite_tmp_url() -> str:
    tmp_db = os.path.join(tempfile.gettempdir(), "trilinguo_production.db").replace("\\", "/")
    return f"sqlite:///{tmp_db}"


def _sanitize_database_url(raw_value: str) -> str:
    cleaned = (raw_value or "").strip()
    if cleaned.upper().startswith("DATABASE_URL="):
        cleaned = cleaned.split("=", 1)[1].strip()
    cleaned = cleaned.strip("\"' \t\r\n")
    if cleaned.startswith("postgres://"):
        cleaned = cleaned.replace("postgres://", "postgresql://", 1)
    if os.getenv("VERCEL") and (not cleaned or cleaned.startswith("sqlite")):
        return _build_sqlite_tmp_url()
    return cleaned or _build_sqlite_tmp_url()


db_url = _sanitize_database_url(settings.DATABASE_URL)


def _create_safe_engine(target_url: str):
    try:
        is_sqlite = target_url.startswith("sqlite")
        connect_args = {"check_same_thread": False} if is_sqlite else {"connect_timeout": 8}
        return create_engine(
            target_url,
            connect_args=connect_args,
            pool_pre_ping=True,
        )
    except Exception as exc:
        print(f"[Trilinguo DB Engine Warning] Invalid DATABASE_URL ({exc}). Falling back to SQLite.")
        return create_engine(
            _build_sqlite_tmp_url(),
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )


engine = _create_safe_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_db_initialized = False


def ensure_db_ready() -> None:
    """
    Lazily initializes database tables and RBAC columns on first request.
    If primary PostgreSQL connection fails at runtime, seamlessly switches to SQLite fallback.
    """
    global _db_initialized, engine, SessionLocal
    if _db_initialized:
        return
    try:
        Base.metadata.create_all(bind=engine)
        for alter_sql in [
            "ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'user'",
            "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
        ]:
            try:
                with engine.begin() as conn:
                    conn.execute(text(alter_sql))
            except Exception:
                pass
        for update_sql in [
            "UPDATE users SET role = 'super_admin', is_active = TRUE WHERE LOWER(email) = 'poheternal@gmail.com'",
            "UPDATE users SET role = 'super_admin', is_active = 1 WHERE LOWER(email) = 'poheternal@gmail.com'",
        ]:
            try:
                with engine.begin() as conn:
                    conn.execute(text(update_sql))
                break
            except Exception:
                pass
        _db_initialized = True
    except Exception as exc:
        print(f"[Trilinguo DB Runtime Warning] Primary DB connection failed ({exc}). Switching to SQLite /tmp.")
        try:
            engine = create_engine(
                _build_sqlite_tmp_url(),
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
            SessionLocal.configure(bind=engine)
            Base.metadata.create_all(bind=engine)
            _db_initialized = True
        except Exception as inner_exc:
            print(f"[Trilinguo DB Fallback Warning] {inner_exc}")


def get_db():
    """FastAPI dependency providing a transactional database session."""
    ensure_db_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
