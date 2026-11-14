"""
============================================================================
TRILINGUO / NYOB ZOO — JWT AUTHENTICATION & SECURITY DEPENDENCIES (dependencies.py)
Protects all authenticated API endpoints via Bearer Token validation.
============================================================================
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, LearningBlock

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


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
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token xác thực không hợp lệ.",
            )
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không tìm thấy tài khoản người dùng.",
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
        sub = payload.get("sub")
        if not sub:
            return None
        return db.query(User).filter(User.id == int(sub)).first()
    except Exception:
        return None
