from pydantic_settings import BaseSettings
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql://concertix_user:concertix_pass@localhost:5432/concertix"

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-secure-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Midtrans
    MIDTRANS_SERVER_KEY: str = ""
    MIDTRANS_CLIENT_KEY: str = ""
    MIDTRANS_IS_PRODUCTION: bool = False

    # App
    APP_NAME: str = "Concertix API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    EXPOSE_API_DOCS: bool = False
    EXPOSE_METRICS: bool = False

    # T7: CORS production whitelist (comma-separated if multiple)
    CORS_ALLOWED_ORIGIN: str = ""

    # Redis (for token blacklist, caching)
    REDIS_URL: str = "redis://redis:6379/0"
    TOKEN_BLACKLIST_FAIL_CLOSED: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


_INSECURE_SECRETS = {"change-this-to-a-secure-secret-key", "secret", ""}


def _has_real_secret(value: str) -> bool:
    return bool(value) and not value.startswith("your_")


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance with security validation."""
    settings = Settings()

    # T2: Validate JWT secret key is not default/insecure
    if settings.JWT_SECRET_KEY in _INSECURE_SECRETS:
        if settings.DEBUG:
            logger.warning(
                "⚠️  JWT_SECRET_KEY is using an INSECURE default value! "
                "Set a strong secret in .env for production."
            )
        else:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong, unique value in production. "
                "Update your .env file."
            )

    if not settings.DEBUG and not settings.CORS_ALLOWED_ORIGIN:
        raise ValueError(
            "CORS_ALLOWED_ORIGIN must be set in production, for example "
            "https://concertix.vercel.app."
        )

    if not settings.DEBUG and not settings.TOKEN_BLACKLIST_FAIL_CLOSED:
        raise ValueError(
            "TOKEN_BLACKLIST_FAIL_CLOSED must be true in production so revoked "
            "tokens are rejected if Redis is unavailable."
        )

    if not settings.DEBUG and not _has_real_secret(settings.MIDTRANS_SERVER_KEY):
        raise ValueError(
            "MIDTRANS_SERVER_KEY must be set in production so payment webhooks "
            "cannot be spoofed."
        )

    if settings.MIDTRANS_IS_PRODUCTION and (
        not _has_real_secret(settings.MIDTRANS_SERVER_KEY)
        or not _has_real_secret(settings.MIDTRANS_CLIENT_KEY)
    ):
        raise ValueError(
            "MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY must be set before enabling "
            "MIDTRANS_IS_PRODUCTION."
        )

    return settings

