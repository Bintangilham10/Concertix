from datetime import datetime, timedelta, timezone
from typing import Optional
import hmac
import secrets
import hashlib
import uuid

from jose import JWTError, jwt
import bcrypt
from app.config import get_settings

settings = get_settings()

def hash_password(password: str) -> str:
    """Hash a plain-text password using native bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(user_id: str, otp: str) -> str:
    """Hash OTP with user-specific context and the app secret."""
    message = f"{user_id}:{otp}".encode("utf-8")
    secret = settings.JWT_SECRET_KEY.encode("utf-8")
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def verify_otp(user_id: str, otp: str, otp_hash: str) -> bool:
    """Verify an OTP against its stored hash."""
    return hmac.compare_digest(hash_otp(user_id, otp), otp_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_token_ttl_seconds(payload: dict) -> int:
    """Return the remaining token lifetime in seconds from a decoded JWT payload."""
    exp = payload.get("exp")
    if exp is None:
        return 0

    try:
        remaining = int(exp) - int(datetime.now(timezone.utc).timestamp())
    except (TypeError, ValueError):
        return 0

    return max(remaining, 0)
