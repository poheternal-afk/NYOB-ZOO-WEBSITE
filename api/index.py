"""
============================================================================
TRILINGUO / NYOB ZOO — VERCEL SERVERLESS PYTHON ENTRYPOINT (api/index.py)
Mounts the FastAPI Production Backend (WEBSITE/backend/main.py) on Vercel 24/7
and connects to a 24/7 Cloud PostgreSQL Database (Supabase / Neon) via DATABASE_URL.
============================================================================
"""

import os
import sys
import traceback
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse

os.environ["VERCEL"] = "1"

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

app = FastAPI(title="Trilinguo NYOB ZOO API")

try:
    from main import app as backend_fastapi_app  # noqa: E402
    app = backend_fastapi_app
except Exception as exc:
    err_trace = traceback.format_exc()
    print(f"[Trilinguo Vercel Boot Error] {exc}\n{err_trace}")

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    def fallback_error_report(path_name: str):
        return JSONResponse(
            status_code=503,
            content={
                "status": "boot_error",
                "detail": str(exc),
                "traceback": err_trace,
            },
        )
