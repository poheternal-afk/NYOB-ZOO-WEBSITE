"""
============================================================================
TRILINGUO / NYOB ZOO — FASTAPI PRODUCTION ENTRYPOINT (main.py)
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
============================================================================
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text
from config import settings
from database import engine, Base
from logger_lib import RequestLoggingMiddleware, log_api_event
from routers import auth, translate, phrases, notebook, profile, system_logs, admin

# Create all database tables on startup
Base.metadata.create_all(bind=engine)


def ensure_rbac_columns_and_super_admin() -> None:
    """
    Safely migrates existing database tables to include `role` and `is_active` on `users`
    and ensures poheternal@gmail.com is registered as 'super_admin'.
    """
    with engine.begin() as conn:
        for alter_sql in [
            "ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'user'",
            "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1",
        ]:
            try:
                conn.execute(text(alter_sql))
            except Exception:
                pass
        try:
            conn.execute(
                text(
                    "UPDATE users SET role = 'super_admin', is_active = TRUE WHERE LOWER(email) = 'poheternal@gmail.com'"
                )
            )
        except Exception:
            try:
                conn.execute(
                    text(
                        "UPDATE users SET role = 'super_admin', is_active = 1 WHERE LOWER(email) = 'poheternal@gmail.com'"
                    )
                )
            except Exception:
                pass


ensure_rbac_columns_and_super_admin()
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
app.include_router(system_logs.router)


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


# 4. Serve Frontend Static Files directly at http://localhost:8000/
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
