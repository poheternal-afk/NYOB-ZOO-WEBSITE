"""
============================================================================
TRILINGUO / NYOB ZOO — FASTAPI PRODUCTION ENTRYPOINT (main.py)
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
============================================================================
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text
from config import settings
from database import engine, Base
from logger_lib import RequestLoggingMiddleware, log_api_event
from routers import auth, translate, phrases, notebook, profile, system_logs, admin


def ensure_rbac_columns_and_super_admin() -> None:
    """
    Safely migrates existing database tables to include `role` and `is_active` on `users`
    and ensures poheternal@gmail.com is registered as 'super_admin'.
    """
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[Trilinguo Startup Warning] create_all notice: {exc}")

    for alter_sql in [
        "ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1",
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


# 4. Serve Frontend HTML & Static Files directly (both Locally & on Vercel Serverless)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
@app.get("/api/index.py", include_in_schema=False)
def serve_index_page():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/{page_name}.html", include_in_schema=False)
def serve_html_pages(page_name: str):
    target_file = FRONTEND_DIR / f"{page_name}.html"
    if target_file.is_file():
        return FileResponse(target_file)
    return FileResponse(FRONTEND_DIR / "index.html")


if FRONTEND_DIR.exists():
    if (FRONTEND_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    if (FRONTEND_DIR / "js").exists():
        app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
