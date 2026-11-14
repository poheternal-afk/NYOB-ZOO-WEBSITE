"""
============================================================================
TRILINGUO / NYOB ZOO — VERCEL SERVERLESS PYTHON ENTRYPOINT (api/index.py)
Mounts the FastAPI Production Backend (WEBSITE/backend/main.py) on Vercel 24/7
and connects to a 24/7 Cloud PostgreSQL Database (Supabase / Neon) via DATABASE_URL.
============================================================================
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("VERCEL", "1")

from main import app  # noqa: E402, F401
