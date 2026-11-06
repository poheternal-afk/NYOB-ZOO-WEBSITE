"""
============================================================================
TRILINGUO / NYOB ZOO — AUTHENTICATION & REAL OAUTH2 / OTP ROUTER
(routers/auth.py)
Implements:
- Google OAuth2 Login, Callback & Token Verification
- Facebook Graph API Login, Callback & Token Verification
- Real 6-digit OTP generation & verification via Gmail SMTP / SMS
- Password Login & Forgot Password OTP Reset
- Mandatory Terms & Learning Profile ("Tôi là" / "Tôi muốn học") validation
============================================================================
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, NotebookItem, TranslationHistory
from schemas import (
    SendOtpRequest,
    VerifyOtpAuthRequest,
    PasswordLoginRequest,
    ForgotPasswordResetRequest,
    GoogleOAuthTokenRequest,
    FacebookOAuthTokenRequest,
    UserResponse,
    TokenResponse,
)
from dependencies import (
    create_access_token,
    get_password_hash,
    verify_password,
    get_current_user,
    make_block_key,
    ensure_learning_block,
)
from services.oauth_service import (
    build_google_authorize_url,
    exchange_google_code_for_user,
    verify_google_tokens,
    build_facebook_authorize_url,
    exchange_facebook_code_for_user,
    verify_facebook_access_token,
)
from services.otp_service import create_and_send_otp, verify_otp_code
from services.translator import DICTIONARY, COMMON_PHRASES, POS_LABELS

router = APIRouter(prefix="/api/auth", tags=["Authentication & OAuth2"])


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        account_name=user.account_name,
        email=user.email,
        phone=user.phone,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
        native_lang=user.native_lang,
        target_lang=user.target_lang,
        accepted_terms=user.accepted_terms,
        learning_block=make_block_key(user.native_lang, user.target_lang),
    )


def seed_initial_block_data_if_empty(db: Session, user: User) -> None:
    """
    Ensures the user's active LearningBlock exists and seeds initial Hmong-Viet-English
    vocabulary items from Learn-Hmong-the-Jay-Way (1).pdf if the block is brand new.
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


# ----------------------------------------------------------------------------
# 1. GOOGLE OAUTH2 ENDPOINTS
# ----------------------------------------------------------------------------

@router.get("/google/login")
def google_oauth_login(
    native_lang: str = Query(default="vi"),
    target_lang: str = Query(default="hmn"),
    redirect: bool = Query(default=False),
):
    state = f"{native_lang}__{target_lang}"
    auth_url = build_google_authorize_url(state=state)
    if redirect:
        return RedirectResponse(url=auth_url)
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_oauth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(default="vi__hmn"),
    db: Session = Depends(get_db),
):
    profile = await exchange_google_code_for_user(code)
    parts = (state or "vi__hmn").split("__")
    native_lang = parts[0] if len(parts) > 0 and parts[0] in ("en", "vi", "hmn") else "vi"
    target_lang = parts[1] if len(parts) > 1 and parts[1] in ("en", "vi", "hmn") else "hmn"
    if native_lang == target_lang:
        target_lang = "hmn" if native_lang != "hmn" else "vi"

    email = (profile.get("email") or "").lower().strip()
    user = db.query(User).filter(User.email == email).first() if email else None
    if not user:
        user = User(
            account_name=profile.get("name") or "Google User",
            email=email or None,
            avatar_url=profile.get("avatar_url"),
            auth_provider="google",
            provider_user_id=profile.get("provider_id"),
            native_lang=native_lang,
            target_lang=target_lang,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        user.auth_provider = "google"
        user.provider_user_id = profile.get("provider_id") or user.provider_user_id
        db.commit()
        db.refresh(user)

    seed_initial_block_data_if_empty(db, user)
    token = create_access_token({"sub": str(user.id), "provider": "google"})
    redirect_to = f"{settings.FRONTEND_BASE_URL}/index.html?auth_token={token}"
    return RedirectResponse(url=redirect_to)


@router.post("/google/token", response_model=TokenResponse)
async def google_oauth_token_verify(
    payload: GoogleOAuthTokenRequest,
    db: Session = Depends(get_db),
):
    validate_profile_and_terms(payload.accepted_terms, payload.native_lang, payload.target_lang)
    profile = await verify_google_tokens(
        id_token=payload.id_token, access_token=payload.access_token
    )
    email = (profile.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể trích xuất địa chỉ Gmail từ Google OAuth Token.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            account_name=profile.get("name") or email.split("@")[0],
            email=email,
            avatar_url=profile.get("avatar_url"),
            auth_provider="google",
            provider_user_id=profile.get("provider_id"),
            native_lang=payload.native_lang,
            target_lang=payload.target_lang,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        user.native_lang = payload.native_lang
        user.target_lang = payload.target_lang
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        user.accepted_terms = True

    db.commit()
    db.refresh(user)
    seed_initial_block_data_if_empty(db, user)

    token = create_access_token({"sub": str(user.id), "provider": "google"})
    return TokenResponse(access_token=token, user=serialize_user(user))


# ----------------------------------------------------------------------------
# 2. FACEBOOK GRAPH API OAUTH ENDPOINTS
# ----------------------------------------------------------------------------

@router.get("/facebook/login")
def facebook_oauth_login(
    native_lang: str = Query(default="vi"),
    target_lang: str = Query(default="hmn"),
    redirect: bool = Query(default=False),
):
    state = f"{native_lang}__{target_lang}"
    auth_url = build_facebook_authorize_url(state=state)
    if redirect:
        return RedirectResponse(url=auth_url)
    return {"auth_url": auth_url}


@router.get("/facebook/callback")
async def facebook_oauth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(default="vi__hmn"),
    db: Session = Depends(get_db),
):
    profile = await exchange_facebook_code_for_user(code)
    parts = (state or "vi__hmn").split("__")
    native_lang = parts[0] if len(parts) > 0 and parts[0] in ("en", "vi", "hmn") else "vi"
    target_lang = parts[1] if len(parts) > 1 and parts[1] in ("en", "vi", "hmn") else "hmn"
    if native_lang == target_lang:
        target_lang = "hmn" if native_lang != "hmn" else "vi"

    fb_id = profile.get("provider_id")
    email = (profile.get("email") or "").lower().strip()

    user = None
    if fb_id:
        user = db.query(User).filter(User.provider_user_id == fb_id, User.auth_provider == "facebook").first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            account_name=profile.get("name") or "Facebook User",
            email=email or None,
            avatar_url=profile.get("avatar_url"),
            auth_provider="facebook",
            provider_user_id=fb_id,
            native_lang=native_lang,
            target_lang=target_lang,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        user.provider_user_id = fb_id or user.provider_user_id

    db.commit()
    db.refresh(user)
    seed_initial_block_data_if_empty(db, user)

    token = create_access_token({"sub": str(user.id), "provider": "facebook"})
    redirect_to = f"{settings.FRONTEND_BASE_URL}/index.html?auth_token={token}"
    return RedirectResponse(url=redirect_to)


@router.post("/facebook/token", response_model=TokenResponse)
async def facebook_oauth_token_verify(
    payload: FacebookOAuthTokenRequest,
    db: Session = Depends(get_db),
):
    validate_profile_and_terms(payload.accepted_terms, payload.native_lang, payload.target_lang)
    profile = await verify_facebook_access_token(payload.access_token)

    fb_id = profile.get("provider_id")
    email = (profile.get("email") or "").lower().strip()

    user = None
    if fb_id:
        user = db.query(User).filter(User.provider_user_id == fb_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            account_name=profile.get("name") or "Facebook User",
            email=email or None,
            avatar_url=profile.get("avatar_url"),
            auth_provider="facebook",
            provider_user_id=fb_id,
            native_lang=payload.native_lang,
            target_lang=payload.target_lang,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        user.native_lang = payload.native_lang
        user.target_lang = payload.target_lang
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        user.accepted_terms = True

    db.commit()
    db.refresh(user)
    seed_initial_block_data_if_empty(db, user)

    token = create_access_token({"sub": str(user.id), "provider": "facebook"})
    return TokenResponse(access_token=token, user=serialize_user(user))


# ----------------------------------------------------------------------------
# 3. REAL OTP SEND & VERIFY (GMAIL SMTP & PHONE SMS/ZALO)
# ----------------------------------------------------------------------------

@router.post("/otp/send")
async def send_otp_endpoint(
    payload: SendOtpRequest,
    db: Session = Depends(get_db),
):
    result = await create_and_send_otp(
        db=db,
        identifier=payload.identifier,
        channel=payload.channel,
        purpose=payload.purpose,
    )
    return result


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp_and_authenticate(
    payload: VerifyOtpAuthRequest,
    db: Session = Depends(get_db),
):
    validate_profile_and_terms(payload.accepted_terms, payload.native_lang, payload.target_lang)

    # Verify the 6-digit OTP in database (checks 5-minute TTL & exact code match)
    verify_otp_code(
        db=db,
        identifier=payload.identifier,
        otp_code=payload.otp_code,
        purpose="login",
    )

    clean_id = payload.identifier.strip().lower()
    is_email = "@" in clean_id

    if is_email:
        user = db.query(User).filter(User.email == clean_id).first()
    else:
        user = db.query(User).filter(User.phone == clean_id).first()

    default_name = (
        payload.account_name.strip()
        if payload.account_name and payload.account_name.strip()
        else (clean_id.split("@")[0] if is_email else f"Học viên {clean_id[-4:]}")
    )

    if not user:
        user = User(
            account_name=default_name,
            email=clean_id if is_email else None,
            phone=None if is_email else clean_id,
            password_hash=get_password_hash(payload.password) if payload.password else None,
            auth_provider="google" if is_email else "phone",
            native_lang=payload.native_lang,
            target_lang=payload.target_lang,
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        if payload.account_name and payload.account_name.strip():
            user.account_name = payload.account_name.strip()
        if payload.password:
            user.password_hash = get_password_hash(payload.password)
        user.native_lang = payload.native_lang
        user.target_lang = payload.target_lang
        user.accepted_terms = True
        user.is_verified = True

    db.commit()
    db.refresh(user)
    seed_initial_block_data_if_empty(db, user)

    token = create_access_token({"sub": str(user.id), "provider": user.auth_provider})
    return TokenResponse(access_token=token, user=serialize_user(user))


# ----------------------------------------------------------------------------
# 4. PASSWORD LOGIN & FORGOT PASSWORD OTP RESET
# ----------------------------------------------------------------------------

@router.post("/login/password", response_model=TokenResponse)
def login_with_password(
    payload: PasswordLoginRequest,
    db: Session = Depends(get_db),
):
    clean_id = payload.identifier.strip().lower()
    user = (
        db.query(User).filter(User.email == clean_id).first()
        if "@" in clean_id
        else db.query(User).filter(User.phone == clean_id).first()
    )
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác!",
        )

    if payload.native_lang and payload.target_lang and payload.native_lang != payload.target_lang:
        user.native_lang = payload.native_lang
        user.target_lang = payload.target_lang
        db.commit()
        db.refresh(user)

    seed_initial_block_data_if_empty(db, user)
    token = create_access_token({"sub": str(user.id), "provider": user.auth_provider})
    return TokenResponse(access_token=token, user=serialize_user(user))


@router.post("/forgot-password/reset")
def reset_password_with_verified_otp(
    payload: ForgotPasswordResetRequest,
    db: Session = Depends(get_db),
):
    verify_otp_code(
        db=db,
        identifier=payload.identifier,
        otp_code=payload.otp_code,
        purpose="forgot_password",
    )

    clean_id = payload.identifier.strip().lower()
    is_email = "@" in clean_id
    user = (
        db.query(User).filter(User.email == clean_id).first()
        if is_email
        else db.query(User).filter(User.phone == clean_id).first()
    )

    if not user:
        user = User(
            account_name=clean_id.split("@")[0] if is_email else f"Học viên {clean_id[-4:]}",
            email=clean_id if is_email else None,
            phone=None if is_email else clean_id,
            password_hash=get_password_hash(payload.new_password),
            auth_provider="email" if is_email else "phone",
            native_lang="vi",
            target_lang="hmn",
            accepted_terms=True,
            is_verified=True,
        )
        db.add(user)
    else:
        user.password_hash = get_password_hash(payload.new_password)

    db.commit()
    return {
        "status": "success",
        "message": "Đặt lại mật khẩu mới thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.",
    }


@router.get("/me", response_model=UserResponse)
def get_authenticated_user_profile(
    current_user: User = Depends(get_current_user),
):
    return serialize_user(current_user)
