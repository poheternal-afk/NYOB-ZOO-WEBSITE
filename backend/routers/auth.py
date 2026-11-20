"""
============================================================================
TRILINGUO / NYOB ZOO — AUTHENTICATION & LEARNING BLOCK ROUTER (routers/auth.py)
Implements:
- Direct Login with Name / Gmail / Phone & Language Learning Block ("Tôi là" / "Tôi muốn học")
- Case-insensitive account resolution & automatic registration if new
- Mandatory Terms validation
- Immutable Super Admin privilege assignment for poheternal@gmail.com
============================================================================
"""

import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, NotebookItem, TranslationHistory
from schemas import DirectLoginRequest, UserResponse, TokenResponse
from dependencies import (
    create_access_token,
    get_current_user,
    make_block_key,
    ensure_learning_block,
    enforce_super_admin_rule,
    is_super_admin_email,
    SUPER_ADMIN_EMAIL,
)
from services.translator import DICTIONARY, COMMON_PHRASES, POS_LABELS

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def serialize_user(user: User) -> UserResponse:
    role_val = "super_admin" if is_super_admin_email(user.email) else (getattr(user, "role", None) or "user")
    is_active_val = True if is_super_admin_email(user.email) else bool(getattr(user, "is_active", True))
    return UserResponse(
        id=user.id,
        account_name=user.account_name,
        email=user.email,
        phone=user.phone,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
        native_lang=user.native_lang,
        target_lang=user.target_lang,
        role=role_val,
        is_active=is_active_val,
        accepted_terms=user.accepted_terms,
        learning_block=make_block_key(user.native_lang, user.target_lang),
    )


def seed_initial_block_data_if_empty(db: Session, user: User) -> None:
    """
    Ensures the user's active LearningBlock exists and seeds initial Hmong-Viet-English
    vocabulary items if the block is brand new.
    """
    block = ensure_learning_block(db, user)
    existing_count = (
        db.query(NotebookItem)
        .filter(NotebookItem.user_id == user.id, NotebookItem.block_key == block.block_key)
        .count()
    )
    if existing_count == 0:
        n_lang = user.native_lang
        t_lang = user.target_lang
        for d in DICTIONARY[:12]:
            pos_code = POS_LABELS.get(d.get("pos", "y"), POS_LABELS["y"])["code"]
            item = NotebookItem(
                user_id=user.id,
                block_key=block.block_key,
                source_text=d.get(n_lang) or d["vi"],
                target_text=d.get(t_lang) or d["hmn"],
                hmn_text=d["hmn"],
                vi_text=d["vi"],
                en_text=d["en"],
                phonetic=d.get("phonetic", ""),
                pos_code=pos_code,
                example_sentence=f"{d.get('exampleHmn', '')} — {d.get('exampleVi', '')}",
                quiz_attempts=0,
                quiz_correct=0,
                remembered=False,
            )
            db.add(item)

        for p in COMMON_PHRASES[:4]:
            hist = TranslationHistory(
                user_id=user.id,
                block_key=block.block_key,
                source_lang=n_lang,
                target_lang=t_lang,
                source_text=p.get(n_lang) or p["vi"],
                translated_text=p.get(t_lang) or p["hmn"],
                hmn_text=p["hmn"],
                vi_text=p["vi"],
                en_text=p["en"],
                phonetic=p.get("phonetic", ""),
                pos_code="(nth) nthe",
                grammar_note=p.get("note", ""),
            )
            db.add(hist)

        db.commit()


def finalize_authenticated_user(db: Session, user: User, provider: str = "email") -> str:
    """
    Enforces the immutable Super Admin rule for poheternal@gmail.com,
    verifies account active status, seeds initial block data, and mints JWT with full recovery claims.
    """
    user = enforce_super_admin_rule(db, user)
    if not getattr(user, "is_active", True) and not is_super_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị khóa bởi Quản trị viên.",
        )
    seed_initial_block_data_if_empty(db, user)
    return create_access_token(
        {
            "sub": str(user.id),
            "email": (user.email or "").lower(),
            "phone": user.phone or "",
            "account_name": user.account_name or "Học viên Trilinguo",
            "role": user.role,
            "native_lang": user.native_lang or "vi",
            "target_lang": user.target_lang or "hmn",
            "provider": provider,
        }
    )


def validate_profile_and_terms(accepted_terms: bool, native_lang: str, target_lang: str) -> None:
    if not accepted_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn bắt buộc phải tích chọn đồng ý với các điều khoản dịch vụ và cho phép sử dụng thông tin cá nhân!",
        )
    if native_lang == target_lang:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngôn ngữ 'Tôi là' và 'Tôi muốn học' phải khác nhau để thiết lập Khối ngôn ngữ học tập!",
        )


@router.post("/login", response_model=TokenResponse)
@router.post("/login/direct", response_model=TokenResponse)
def direct_login(
    payload: DirectLoginRequest,
    db: Session = Depends(get_db),
):
    validate_profile_and_terms(payload.accepted_terms, payload.native_lang, payload.target_lang)

    raw_id = (payload.identifier or "").strip()
    raw_name = (payload.account_name or "").strip()

    # Check if either field contains Super Admin email
    if is_super_admin_email(raw_id) or is_super_admin_email(raw_name):
        clean_id = SUPER_ADMIN_EMAIL
    else:
        clean_id = (raw_id or raw_name or "hocvien@trilinguo.vn").strip().lower()

    is_email = "@" in clean_id
    is_phone = bool(re.match(r"^[0-9+\-\s]{7,20}$", clean_id))

    user = None

    # 1. Lookup by Email (case-insensitive)
    if is_email:
        user = db.query(User).filter(func.lower(User.email) == clean_id).first()
    elif "@" in raw_name:
        user = db.query(User).filter(func.lower(User.email) == raw_name.lower()).first()

    # 2. Lookup by Phone
    if not user and is_phone:
        user = db.query(User).filter(User.phone == clean_id).first()

    # 3. Lookup by Account Name / Username (case-insensitive)
    if not user:
        user = db.query(User).filter(func.lower(User.account_name) == clean_id).first()
    if not user and raw_name:
        user = db.query(User).filter(func.lower(User.account_name) == raw_name.lower()).first()

    # 4. Also check synthesized email for username-only login
    slug_id = re.sub(r"[^a-z0-9._-]+", "", clean_id.replace(" ", "_")) or "user"
    synthetic_email = clean_id if is_email else (raw_name.lower() if "@" in raw_name else f"{slug_id}@trilinguo.vn")
    if not user:
        user = db.query(User).filter(func.lower(User.email) == synthetic_email).first()

    default_name = (
        raw_name
        if (raw_name and not is_super_admin_email(raw_name))
        else (
            "Poh Eternal (Super Admin)"
            if clean_id == SUPER_ADMIN_EMAIL
            else (raw_id.split("@")[0] if is_email else (raw_id or "Học viên Trilinguo"))
        )
    )

    if not user:
        is_super = is_super_admin_email(synthetic_email)
        user = User(
            account_name=default_name,
            email=synthetic_email,
            phone=clean_id if is_phone else None,
            auth_provider="email" if is_email else ("phone" if is_phone else "direct"),
            native_lang=payload.native_lang,
            target_lang=payload.target_lang,
            role="super_admin" if is_super else "user",
            is_active=True,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        if raw_name and not is_super_admin_email(raw_name) and "@" not in raw_name:
            user.account_name = raw_name
        user.native_lang = payload.native_lang
        user.target_lang = payload.target_lang
        user.accepted_terms = True
        user.is_verified = True

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        user = (
            db.query(User)
            .filter(func.lower(User.email) == synthetic_email)
            .first()
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể lưu phiên đăng nhập vào cơ sở dữ liệu.",
            )

    token = finalize_authenticated_user(db, user, provider=user.auth_provider)
    return TokenResponse(access_token=token, user=serialize_user(user))


@router.get("/me", response_model=UserResponse)
def get_authenticated_user_profile(
    current_user: User = Depends(get_current_user),
):
    return serialize_user(current_user)
