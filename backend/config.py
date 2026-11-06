"""
============================================================================
TRILINGUO / NYOB ZOO — ENVIRONMENT & APPLICATION CONFIGURATION (config.py)
============================================================================
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Trilinguo NYOB ZOO API")
    APP_ENV: str = os.getenv("APP_ENV", "production")
    BACKEND_BASE_URL: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:8000").rstrip("/")

    # Database (Supports Supabase PostgreSQL or SQLite production file)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(BASE_DIR / 'trilinguo_production.db').as_posix()}"
    )

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        "trilinguo-nyob-zoo-tavan-super-secret-jwt-key-2026-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

    # Google OAuth2 Credentials
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/auth/google/callback"
    ).strip()

    # Facebook Graph OAuth2 Credentials
    FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "").strip()
    FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "").strip()
    FACEBOOK_REDIRECT_URI: str = os.getenv(
        "FACEBOOK_REDIRECT_URI",
        "http://localhost:8000/api/auth/facebook/callback"
    ).strip()

    # Gmail SMTP Configuration (Port 587 STARTTLS)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "").strip()
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "NYOB ZOO · Trilinguo Tả Van").strip()

    # SMS / Zalo Gateway Configuration
    SMS_GATEWAY_URL: str = os.getenv("SMS_GATEWAY_URL", "").strip()
    SMS_GATEWAY_API_KEY: str = os.getenv("SMS_GATEWAY_API_KEY", "").strip()

    # OTP Expiration (5 minutes = 300 seconds)
    OTP_TTL_SECONDS: int = int(os.getenv("OTP_TTL_SECONDS", "300"))


settings = Settings()
