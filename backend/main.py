"""
============================================================================
TRILINGUO / NYOB ZOO — FASTAPI PRODUCTION ENTRYPOINT (main.py)
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
============================================================================
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import ensure_db_ready
from logger_lib import RequestLoggingMiddleware, log_api_event
from routers import auth, translate, phrases, notebook, profile, system_logs, admin, corpus

# Initialize DB immediately when running locally; on Vercel Serverless, get_db() initializes lazily
if not os.getenv("VERCEL"):
    ensure_db_ready()

log_api_event("info", "Trilinguo NYOB ZOO Backend starting up (RBAC & Admin Portal enabled)...", component_id="CMP-SYS-BOOT")

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production Backend API for NYOB ZOO · Trilinguo (English - Vietnamese/Kinh - Hmong) "
        "with Language Learning Blocks, RBAC & Admin Portal."
    ),
    version="2.0.0",
)

# 1. CORS Middleware (Allows frontend on any local/production port to communicate with API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Structured Request & Error Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Register API Routers
app.include_router(auth.router)
app.include_router(translate.router)
app.include_router(phrases.router)
app.include_router(notebook.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(corpus.router)
app.include_router(system_logs.router)


@app.get("/api/health", tags=["System"])
def health_check():
    ensure_db_ready()
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


# 4. Serve Frontend Static Files directly when running locally (http://localhost:8000/)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if not os.getenv("VERCEL") and FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
