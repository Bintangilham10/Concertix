import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
BREVO_EMAILS_URL = "https://api.brevo.com/v3/smtp/email"
RESEND_EMAILS_URL = "https://api.resend.com/emails"


def send_password_reset_otp(email: str, otp: str) -> bool:
    """Send a password reset OTP email.

    In debug mode without SMTP configuration, the OTP is logged so local demos
    can still exercise the reset flow without a mail provider.
    """
    settings = get_settings()
    if settings.BREVO_API_KEY:
        return _send_via_brevo(email, otp)

    if settings.RESEND_API_KEY:
        return _send_via_resend(email, otp)

    if not settings.SMTP_HOST:
        if settings.DEBUG:
            logger.warning("Password reset OTP for %s: %s", email, otp)
            return True
        return False

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    if not from_email:
        logger.error("SMTP_FROM_EMAIL or SMTP_USERNAME must be configured")
        return False

    message = EmailMessage()
    message["Subject"] = "Kode OTP Reset Password Concertix"
    message["From"] = from_email
    message["To"] = email
    message.set_content(
        "Halo,\n\n"
        f"Kode OTP reset password Concertix kamu adalah: {otp}\n\n"
        f"Kode ini berlaku selama {settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} menit. "
        "Abaikan email ini jika kamu tidak meminta reset password.\n\n"
        "Concertix"
    )

    try:
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                _login_if_needed(smtp, settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                _login_if_needed(smtp, settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        return True
    except Exception:
        logger.exception("Failed to send password reset OTP email")
        return False


def _login_if_needed(smtp: smtplib.SMTP, username: str, password: str) -> None:
    if username and password:
        smtp.login(username, password)


def _build_otp_text(otp: str) -> str:
    settings = get_settings()
    return (
        "Halo,\n\n"
        f"Kode OTP reset password Concertix kamu adalah: {otp}\n\n"
        f"Kode ini berlaku selama {settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} menit. "
        "Abaikan email ini jika kamu tidak meminta reset password.\n\n"
        "Concertix"
    )


def _send_via_brevo(email: str, otp: str) -> bool:
    settings = get_settings()
    from_email = settings.BREVO_FROM_EMAIL or settings.SMTP_FROM_EMAIL
    if not from_email:
        logger.error("BREVO_FROM_EMAIL or SMTP_FROM_EMAIL must be configured")
        return False

    payload = {
        "sender": {
            "name": settings.BREVO_FROM_NAME,
            "email": from_email,
        },
        "to": [{"email": email}],
        "subject": "Kode OTP Reset Password Concertix",
        "textContent": _build_otp_text(otp),
    }

    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(
                BREVO_EMAILS_URL,
                headers={
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("Failed to send password reset OTP email via Brevo")
        return False


def _send_via_resend(email: str, otp: str) -> bool:
    settings = get_settings()
    from_email = settings.RESEND_FROM_EMAIL or settings.SMTP_FROM_EMAIL
    if not from_email:
        logger.error("RESEND_FROM_EMAIL or SMTP_FROM_EMAIL must be configured")
        return False

    payload = {
        "from": from_email,
        "to": [email],
        "subject": "Kode OTP Reset Password Concertix",
        "text": _build_otp_text(otp),
    }

    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(
                RESEND_EMAILS_URL,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("Failed to send password reset OTP email via Resend")
        return False
