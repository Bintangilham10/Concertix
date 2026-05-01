from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.password_reset_otp import PasswordResetOTP
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.middleware.rate_limiter import limiter
from app.middleware.auth_middleware import get_current_user
from app.services.email_service import send_password_reset_otp
from app.services.auth_service import (
    generate_otp,
    hash_otp,
    hash_password,
    verify_password,
    verify_otp,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_ttl_seconds,
)
from app.services.token_blacklist import blacklist_token, is_token_blacklisted

router = APIRouter()
security = HTTPBearer()

FORGOT_PASSWORD_MESSAGE = (
    "Jika email terdaftar, kode OTP reset password telah dikirim."
)


def _token_data_for_user(user: User) -> dict:
    return {"sub": user.id, "token_version": user.token_version or 0}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new customer account."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar",
        )

    # Create user
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
        role="customer",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate tokens
    token_data = _token_data_for_user(new_user)
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens (with debug)."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )

    token_data = _token_data_for_user(user)
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send a password reset OTP to a registered email address."""
    settings = get_settings()
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return ForgotPasswordResponse(message=FORGOT_PASSWORD_MESSAGE)

    now = datetime.now(timezone.utc)
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.consumed_at.is_(None),
    ).update({PasswordResetOTP.consumed_at: now}, synchronize_session=False)

    otp = generate_otp()
    reset_otp = PasswordResetOTP(
        user_id=user.id,
        otp_hash=hash_otp(user.id, otp),
        expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES),
    )
    db.add(reset_otp)
    db.commit()

    if not send_password_reset_otp(user.email, otp):
        reset_otp.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan email sedang tidak tersedia. Coba lagi nanti.",
        )

    return ForgotPasswordResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=ForgotPasswordResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset a user's password using a valid OTP."""
    settings = get_settings()
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid atau sudah kedaluwarsa",
        )

    now = datetime.now(timezone.utc)
    reset_otp = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.consumed_at.is_(None),
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not reset_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid atau sudah kedaluwarsa",
        )

    expires_at = reset_otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid atau sudah kedaluwarsa",
        )

    if reset_otp.attempt_count >= settings.PASSWORD_RESET_OTP_MAX_ATTEMPTS:
        reset_otp.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP terlalu sering dicoba. Minta kode baru.",
        )

    if not verify_otp(user.id, payload.otp, reset_otp.otp_hash):
        reset_otp.attempt_count += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid atau sudah kedaluwarsa",
        )

    user.password_hash = hash_password(payload.password)
    user.token_version = (user.token_version or 0) + 1
    reset_otp.consumed_at = now
    db.commit()

    return ForgotPasswordResponse(message="Kata sandi berhasil diubah. Silakan login kembali.")


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
):
    """
    Logout the current user by blacklisting their JWT token.

    T1 Mitigation: Token is added to Redis blacklist so it cannot be
    reused even if it hasn't expired yet.
    """
    token = credentials.credentials
    payload = decode_token(token) or {}
    ttl_seconds = get_token_ttl_seconds(payload)
    success = blacklist_token(token, ttl_seconds=ttl_seconds) if ttl_seconds > 0 else False

    return {
        "message": "Logout berhasil",
        "token_revoked": success,
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Return the currently authenticated user's profile.
    Used by the frontend to verify auth state and check role on page load.
    """
    return current_user


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    refresh_data: TokenRefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Refresh access token using a valid refresh token."""
    if is_token_blacklisted(refresh_data.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token sudah digunakan. Silakan login ulang.",
        )

    payload = decode_token(refresh_data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan",
        )

    token_version = payload.get("token_version", 0)
    if token_version != (user.token_version or 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi sudah tidak valid. Silakan login ulang.",
        )

    token_data = _token_data_for_user(user)
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    ttl_seconds = get_token_ttl_seconds(payload)
    if ttl_seconds > 0:
        revoked = blacklist_token(refresh_data.refresh_token, ttl_seconds=ttl_seconds)
        if not revoked and get_settings().TOKEN_BLACKLIST_FAIL_CLOSED:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Token revocation service unavailable",
            )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )

