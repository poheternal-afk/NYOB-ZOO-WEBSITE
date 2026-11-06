"""
============================================================================
TRILINGUO / NYOB ZOO — REAL GOOGLE OAUTH2 & FACEBOOK GRAPH API SERVICE
(services/oauth_service.py)
============================================================================
"""

from urllib.parse import urlencode
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from config import settings


GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo"

FACEBOOK_AUTH_ENDPOINT = "https://www.facebook.com/v19.0/dialog/oauth"
FACEBOOK_TOKEN_ENDPOINT = "https://graph.facebook.com/v19.0/oauth/access_token"
FACEBOOK_GRAPH_ME_ENDPOINT = "https://graph.facebook.com/me"


def build_google_authorize_url(state: str = "") -> str:
    """
    Constructs the Google OAuth2 authorization URL requesting scope: openid email profile.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Chưa cấu hình GOOGLE_CLIENT_ID trong file WEBSITE/backend/.env. "
                "Bạn có thể điền GOOGLE_CLIENT_ID vào .env hoặc xác thực trực tiếp bằng mã OTP gửi qua Gmail."
            ),
        )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_google_code_for_user(code: str) -> Dict[str, Any]:
    """
    Exchanges an OAuth2 authorization code with Google and retrieves real user profile.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET trong .env.",
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Không thể đổi mã ủy quyền Google OAuth2: {token_resp.text}",
            )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        id_token = token_data.get("id_token")
        return await verify_google_tokens(id_token=id_token, access_token=access_token)


async def verify_google_tokens(
    id_token: Optional[str] = None,
    access_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Verifies a Google id_token or access_token directly against Google Identity APIs:
    - https://oauth2.googleapis.com/tokeninfo
    - https://www.googleapis.com/oauth2/v3/userinfo
    Returns normalized dict: {provider_id, email, name, avatar_url}
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        if access_token:
            resp = await client.get(
                GOOGLE_USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "provider_id": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name") or (data.get("email") or "").split("@")[0],
                    "avatar_url": data.get("picture"),
                }

        if id_token:
            resp = await client.get(
                GOOGLE_TOKENINFO_ENDPOINT,
                params={"id_token": id_token},
            )
            if resp.status_code == 200:
                data = resp.json()
                if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google ID Token audience (aud) không khớp với GOOGLE_CLIENT_ID.",
                    )
                return {
                    "provider_id": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name") or (data.get("email") or "").split("@")[0],
                    "avatar_url": data.get("picture"),
                }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token Google OAuth2 không hợp lệ hoặc đã hết hạn.",
    )


def build_facebook_authorize_url(state: str = "") -> str:
    """
    Constructs the Facebook OAuth dialog URL requesting scope: public_profile,email.
    """
    if not settings.FACEBOOK_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa cấu hình FACEBOOK_APP_ID trong file WEBSITE/backend/.env.",
        )
    params = {
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
        "scope": "public_profile,email",
        "response_type": "code",
    }
    if state:
        params["state"] = state
    return f"{FACEBOOK_AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_facebook_code_for_user(code: str) -> Dict[str, Any]:
    """
    Exchanges a Facebook authorization code for an access_token and fetches Graph profile.
    """
    if not settings.FACEBOOK_APP_ID or not settings.FACEBOOK_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET trong .env.",
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.get(
            FACEBOOK_TOKEN_ENDPOINT,
            params={
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
                "code": code,
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Không thể đổi mã ủy quyền Facebook: {token_resp.text}",
            )
        access_token = token_resp.json().get("access_token")
        return await verify_facebook_access_token(access_token)


async def verify_facebook_access_token(access_token: str) -> Dict[str, Any]:
    """
    Verifies a Facebook access_token with Facebook Graph API:
    https://graph.facebook.com/me?fields=id,name,email,picture&access_token=...
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            FACEBOOK_GRAPH_ME_ENDPOINT,
            params={
                "fields": "id,name,email,picture.type(large)",
                "access_token": access_token,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Facebook Access Token không hợp lệ hoặc đã hết hạn.",
            )
        data = resp.json()
        pic_url = None
        if isinstance(data.get("picture"), dict):
            pic_url = data["picture"].get("data", {}).get("url")
        return {
            "provider_id": data.get("id"),
            "email": data.get("email"),
            "name": data.get("name") or f"Facebook User {data.get('id', '')[-4:]}",
            "avatar_url": pic_url,
        }
