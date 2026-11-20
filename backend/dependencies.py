"""
============================================================================
TRILINGUO / NYOB ZOO — JWT AUTHENTICATION & RBAC DEPENDENCIES (dependencies.py)
Protects all authenticated & Admin API endpoints via Bearer Token validation
with automatic JWT account recovery across Serverless / Supabase instances.
============================================================================
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, LearningBlock
from setup_database import seed_user_block_and_vocabulary

bearer_scheme = HTTPBearer(auto_error=False)

SUPER_ADMIN_EMAIL = "poheternal@gmail.com"


def is_super_admin_email(email: Optional[str]) -> bool:
    return bool(email and email.strip().lower() == SUPER_ADMIN_EMAIL)


def enforce_super_admin_rule(db: Session, user: User) -> User:
    """
    Immutable Hard-Rule: If user.email == 'poheternal@gmail.com',
    automatically assign role = 'super_admin' and is_active = True in Database.
    """
    if not user:
        return user
    changed = False
    if is_super_admin_email(user.email):
        if getattr(user, "role", None) != "super_admin":
            user.role = "super_admin"
            changed = True
        if not getattr(user, "is_active", True):
            user.is_active = True
            changed = True
    else:
        if not getattr(user, "role", None):
            user.role = "user"
            changed = True
        if getattr(user, "is_active", None) is None:
            user.is_active = True
            changed = True

    if changed:
        db.commit()
        db.refresh(user)
    return user


def make_block_key(native_lang: str, target_lang: str) -> str:
    n = (native_lang or "vi").strip().lower()
    t = (target_lang or "hmn").strip().lower()
    if n == t:
        t = "hmn" if n != "hmn" else "vi"
    return f"{n}_{t}"


def ensure_learning_block(db: Session, user: User) -> LearningBlock:
    block_key = make_block_key(user.native_lang, user.target_lang)
    block = (
        db.query(LearningBlock)
        .filter(LearningBlock.user_id == user.id, LearningBlock.block_key == block_key)
        .first()
    )
    if not block:
        block = LearningBlock(
            user_id=user.id,
            block_key=block_key,
            native_lang=user.native_lang,
            target_lang=user.target_lang,
            total_quiz_questions=0,
            total_quiz_correct=0,
        )
        db.add(block)
        db.commit()
        db.refresh(block)
    return block


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def resolve_or_restore_user_from_jwt_payload(db: Session, payload: dict) -> Optional[User]:
    """
    Resolves the authenticated User from a verified JWT payload:
    1. Matches by `email` (case-insensitive) if present in JWT claims.
    2. Matches by `sub` (User.id) if email matches or no email in claim.
    3. Matches by `phone` or `account_name`.
    4. If not found (e.g. fresh DB migration or new Serverless instance),
       automatically restores/provisions the User record from the signed JWT claims.
    """
    sub = payload.get("sub")
    jwt_email = (payload.get("email") or "").strip().lower()
    jwt_phone = (payload.get("phone") or "").strip()
    jwt_name = (payload.get("account_name") or "").strip()
    jwt_role = (payload.get("role") or "user").strip()
    jwt_native = (payload.get("native_lang") or "vi").strip()
    jwt_target = (payload.get("target_lang") or "hmn").strip()
    if jwt_native == jwt_target:
        jwt_target = "hmn" if jwt_native != "hmn" else "vi"

    user: Optional[User] = None

    # 1. Lookup by email first (most stable identifier across DB instances)
    if jwt_email:
        user = db.query(User).filter(func.lower(User.email) == jwt_email).first()

    # 2. Lookup by numeric user_id (`sub`)
    if not user and sub is not None:
        try:
            uid = int(sub)
            candidate = db.query(User).filter(User.id == uid).first()
            if candidate:
                if not jwt_email or (candidate.email or "").strip().lower() == jwt_email:
                    user = candidate
        except (ValueError, TypeError):
            pass

    # 3. Lookup by phone
    if not user and jwt_phone:
        user = db.query(User).filter(User.phone == jwt_phone).first()

    # 4. Lookup by account_name
    if not user and jwt_name:
        user = (
            db.query(User)
            .filter(func.lower(User.account_name) == jwt_name.lower())
            .first()
        )

    # 5. Self-healing provisioning from signed JWT claims if user record is still missing
    if not user and (jwt_email or jwt_phone or jwt_name or sub):
        is_super = is_super_admin_email(jwt_email)
        resolved_name = (
            jwt_name
            or (
                "Poh Eternal (Super Admin)"
                if is_super
                else (jwt_email.split("@")[0] if jwt_email else f"Học viên {sub or 'Trilinguo'}")
            )
        )
        resolved_role = "super_admin" if is_super else (jwt_role if jwt_role in ("user", "admin", "super_admin") else "user")

        try:
            user = User(
                account_name=resolved_name,
                email=jwt_email if jwt_email else None,
                phone=jwt_phone if jwt_phone else None,
                auth_provider=payload.get("provider") or ("email" if jwt_email else "direct"),
                native_lang=jwt_native,
                target_lang=jwt_target,
                role=resolved_role,
                is_active=True,
                accepted_terms=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()
            seed_user_block_and_vocabulary(db, user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            if jwt_email:
                user = db.query(User).filter(func.lower(User.email) == jwt_email).first()

    return user


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Mandatory JWT Bearer authentication guard for all protected endpoints.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập để sử dụng tính năng này (Missing Bearer Token).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = resolve_or_restore_user_from_jwt_payload(db, payload)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
        )

    user = enforce_super_admin_rule(db, user)
    if not getattr(user, "is_active", True) and not is_super_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị khóa bởi Quản trị viên.",
        )
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    RBAC Guard for all Admin Portal endpoints (/api/admin/*).
    Allows access if current_user.email == 'poheternal@gmail.com' or role in ['admin', 'super_admin'].
    """
    current_user = enforce_super_admin_rule(db, current_user)
    if is_super_admin_email(current_user.email) or getattr(current_user, "role", "user") in [
        "admin",
        "super_admin",
    ]:
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền truy cập khu vực Quản trị viên",
    )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional user resolver for endpoints like /api/translate that work pre-login
    and automatically save to TranslationHistory when logged in.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return resolve_or_restore_user_from_jwt_payload(db, payload)
    except Exception:
        return None
