"""
T4 Mitigation: Rate Limiting Middleware.

Uses slowapi to prevent brute-force attacks and DoS on sensitive endpoints.
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import get_settings

settings = get_settings()

def get_rate_limit_key(request: Request) -> str:
    """Return a stable client key for rate limiting."""
    if settings.TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

    return request.client.host if request.client else "unknown"


rate_limit_storage_url = settings.RATE_LIMIT_STORAGE_URL or settings.REDIS_URL

# Create a shared limiter instance backed by Redis when available. In debug mode,
# local demos can fall back to memory if Redis is not running yet.
limiter = Limiter(
    key_func=get_rate_limit_key,
    storage_uri=rate_limit_storage_url,
    in_memory_fallback_enabled=settings.DEBUG,
)


def setup_rate_limiter(app: FastAPI) -> None:
    """
    Attach slowapi rate-limiting middleware to the FastAPI app.

    The limiter instance can be used as a decorator on individual routes:
        @router.post("/login")
        @limiter.limit("5/minute")
        async def login(request: Request, ...): ...
    """
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Terlalu banyak request. Silakan coba lagi nanti.",
                "retry_after": str(exc.detail),
            },
        )
