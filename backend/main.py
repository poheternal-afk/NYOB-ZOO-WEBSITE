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
from starlette.middleware.sessions import SessionMiddleware

from config import settings
from database import engine, Base
from routers import auth, translate, phrases, notebook, profile

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production Backend API for NYOB ZOO · Trilinguo (English - Vietnamese/Kinh - Hmong) "
        "with Real Google OAuth2, Facebook Graph API, Gmail SMTP OTP, and Language Learning Blocks."
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

# 2. Session Middleware (Used for OAuth state / session security)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_SECRET_KEY,
)

# 3. Register API Routers
app.include_router(auth.router)
app.include_router(translate.router)
app.include_router(phrases.router)
app.include_router(notebook.router)
app.include_router(profile.router)


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "oauth_configured": {
            "google": bool(settings.GOOGLE_CLIENT_ID),
            "facebook": bool(settings.FACEBOOK_APP_ID),
            "smtp": bool(settings.SMTP_USER and settings.SMTP_PASSWORD),
        },
    }


# 4. Serve Frontend Static Files directly at http://localhost:8000/
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
