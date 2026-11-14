"""
============================================================================
TRILINGUO / NYOB ZOO — DATABASE ENGINE & SESSION MANAGEMENT (database.py)
Supports Supabase PostgreSQL & SQLite with automatic connection pooling.
============================================================================
"""

import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# If deployed on read-only serverless (e.g. Vercel) without a cloud DATABASE_URL set yet,
# store SQLite in /tmp so writes never fail.
if os.getenv("VERCEL") and db_url.startswith("sqlite"):
    tmp_db = os.path.join(tempfile.gettempdir(), "trilinguo_production.db").replace("\\", "/")
    db_url = f"sqlite:///{tmp_db}"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
