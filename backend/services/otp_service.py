"""
============================================================================
TRILINGUO / NYOB ZOO — REAL GMAIL SMTP & SMS/ZALO OTP SERVICE
(services/otp_service.py)
Connects to smtp.gmail.com (Port 587, STARTTLS) using aiosmtplib and stores
6-digit OTP codes with a strict 5-minute TTL in the database.
============================================================================
"""

import secrets
import logging
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Dict, Any
import aiosmtplib
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from models import OtpVerification

logger = logging.getLogger("trilinguo.otp")


def generate_six_digit_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP string (100000 - 999999)."""
    return f"{secrets.randbelow(900000) + 100000:06d}"


def build_otp_html_email(otp_code: str, purpose: str, recipient_email: str) -> str:
    purpose_titles = {
        "register": "Xác Thực Đăng Ký Tài Khoản Trilinguo",
        "login": "Mã Xác Thực Đăng Nhập (OTP) Trilinguo",
        "forgot_password": "Khôi Phục Mật Khẩu Tài Khoản Trilinguo",
    }
    title = purpose_titles.get(purpose, "Mã Xác Thực Bảo Mật OTP Trilinguo")

    return f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
    </head>
    <body style="margin:0;padding:24px;background-color:#f4f7f2;font-family:'Segoe UI',Arial,sans-serif;color:#1d4e5b;">
      <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:2px solid #38a3bc;box-shadow:0 12px 30px rgba(24,68,78,0.12);">
        <div style="background:linear-gradient(135deg,#276474,#38a3bc);padding:24px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;letter-spacing:1px;">NYOB ZOO · TRILINGUO</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#cefbe6;">Lus zoo los ntawm Tả Van — Anh · Kinh · Hmong</p>
        </div>
        <div style="padding:28px 26px;">
          <h2 style="margin-top:0;color:#276474;font-size:20px;">{title}</h2>
          <p style="font-size:15px;line-height:1.6;color:#355e54;">
            Xin chào <strong>{recipient_email}</strong>,<br/>
            Vui lòng sử dụng mã OTP 6 chữ số dưới đây để hoàn tất xác thực trên hệ thống <strong>NYOB ZOO · Trilinguo</strong>:
          </p>
          <div style="margin:24px 0;padding:18px;background:#fffbe3;border:2px dashed #ff9d1d;border-radius:14px;text-align:center;">
            <span style="font-size:34px;font-weight:900;letter-spacing:8px;color:#264e36;">{otp_code}</span>
          </div>
          <p style="font-size:13px;color:#687f79;line-height:1.5;">
            ⏳ Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong> ({settings.OTP_TTL_SECONDS // 60} phút). Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
          </p>
        </div>
        <div style="background:#ebf5ee;padding:14px 24px;text-align:center;font-size:12px;color:#2d5f3e;">
          © NYOB ZOO · Trilinguo Tả Van — Lo lus pab peb sib to taub.
        </div>
      </div>
    </body>
    </html>
    """


async def send_email_otp_via_smtp(recipient_email: str, otp_code: str, purpose: str) -> Dict[str, Any]:
    """
    Sends the 6-digit OTP email asynchronously via Gmail SMTP (smtp.gmail.com:587 STARTTLS).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP_USER / SMTP_PASSWORD not set in .env. OTP [%s] generated for %s (configure .env for live SMTP delivery).",
            otp_code,
            recipient_email,
        )
        return {
            "sent_via_smtp": False,
            "message": (
                f"Đã tạo mã OTP xác thực cho {recipient_email}. "
                "(Lưu ý: Điền SMTP_USER & SMTP_PASSWORD trong backend/.env để gửi qua Gmail SMTP thật; "
                f"mã OTP vừa tạo trong DB là: {otp_code})"
            ),
            "otp_preview": otp_code,
        }

    msg = EmailMessage()
    msg["Subject"] = f"[{otp_code}] Mã xác thực OTP — NYOB ZOO Trilinguo"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = recipient_email
    msg.set_content(
        f"Mã xác thực OTP của bạn trên NYOB ZOO Trilinguo là: {otp_code}. Mã có hiệu lực trong 5 phút."
    )
    msg.add_alternative(
        build_otp_html_email(otp_code=otp_code, purpose=purpose, recipient_email=recipient_email),
        subtype="html",
    )

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            timeout=15.0,
        )
        return {
            "sent_via_smtp": True,
            "message": f"Đã gửi mã OTP 6 số tới hộp thư Gmail {recipient_email}. Vui lòng kiểm tra Inbox/Spam!",
        }
    except Exception as exc:
        logger.error("SMTP delivery error to %s: %s", recipient_email, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Không thể gửi email qua SMTP ({settings.SMTP_HOST}): {str(exc)}. Vui lòng kiểm tra App Password Gmail trong .env.",
        )


async def send_sms_otp_via_gateway(phone_number: str, otp_code: str, purpose: str) -> Dict[str, Any]:
    """
    Sends the 6-digit OTP to a phone number via configured SMS/Zalo Gateway webhook.
    """
    if not settings.SMS_GATEWAY_URL:
        logger.warning(
            "SMS_GATEWAY_URL not set in .env. OTP [%s] stored in DB for phone %s.",
            otp_code,
            phone_number,
        )
        return {
            "sent_via_sms": False,
            "message": (
                f"Đã tạo mã OTP xác thực cho SĐT {phone_number}. "
                f"(Cấu hình SMS_GATEWAY_URL trong .env để bắn SMS/Zalo thật; mã OTP trong DB là: {otp_code})"
            ),
            "otp_preview": otp_code,
        }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                settings.SMS_GATEWAY_URL,
                json={
                    "phone": phone_number,
                    "otp": otp_code,
                    "purpose": purpose,
                    "message": f"[NYOB ZOO Trilinguo] Ma OTP xac thuc cua ban la {otp_code} (hieu luc 5 phut).",
                },
                headers={"Authorization": f"Bearer {settings.SMS_GATEWAY_API_KEY}"},
            )
            resp.raise_for_status()
        return {
            "sent_via_sms": True,
            "message": f"Đã gửi mã OTP xác thực qua SMS/Zalo tới số điện thoại {phone_number}.",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi kết nối cổng SMS/Zalo Gateway: {str(exc)}",
        )


async def create_and_send_otp(
    db: Session,
    identifier: str,
    channel: str = "email",
    purpose: str = "login",
) -> Dict[str, Any]:
    """
    Creates a 6-digit OTP with 5-minute TTL in the database and dispatches it via Gmail SMTP or SMS.
    """
    clean_id = identifier.strip().lower()
    if not clean_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập địa chỉ Gmail hoặc Số điện thoại hợp lệ.",
        )

    otp_code = generate_six_digit_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_TTL_SECONDS)

    # Invalidate older unverified OTPs for the same identifier & purpose
    db.query(OtpVerification).filter(
        OtpVerification.identifier == clean_id,
        OtpVerification.purpose == purpose,
        OtpVerification.verified == False,  # noqa: E712
    ).delete(synchronize_session=False)

    otp_record = OtpVerification(
        identifier=clean_id,
        channel=channel,
        purpose=purpose,
        otp_code=otp_code,
        expires_at=expires_at,
        verified=False,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    if channel == "phone" or (not "@" in clean_id):
        delivery = await send_sms_otp_via_gateway(clean_id, otp_code, purpose)
    else:
        delivery = await send_email_otp_via_smtp(clean_id, otp_code, purpose)

    return {
        "identifier": clean_id,
        "channel": channel,
        "purpose": purpose,
        "expires_in_seconds": settings.OTP_TTL_SECONDS,
        **delivery,
    }


def verify_otp_code(
    db: Session,
    identifier: str,
    otp_code: str,
    purpose: str = "login",
) -> bool:
    """
    Verifies that the submitted 6-digit OTP matches an active, non-expired record in the database.
    """
    clean_id = identifier.strip().lower()
    clean_code = otp_code.strip()

    record = (
        db.query(OtpVerification)
        .filter(
            OtpVerification.identifier == clean_id,
            OtpVerification.otp_code == clean_code,
            OtpVerification.verified == False,  # noqa: E712
        )
        .order_by(OtpVerification.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không chính xác hoặc đã được sử dụng. Vui lòng kiểm tra lại!",
        )

    now = datetime.now(timezone.utc)
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP đã hết hạn (quá 5 phút). Vui lòng bấm gửi lại mã OTP mới!",
        )

    record.verified = True
    db.commit()
    return True
