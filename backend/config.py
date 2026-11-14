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

    # Database (Supports 24/7 Cloud PostgreSQL or Local SQLite fallback)
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


settings = Settings()
