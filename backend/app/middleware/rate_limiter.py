"""
T4 Mitigation: Rate Limiting Middleware.

Uses slowapi to prevent brute-force attacks and DoS on sensitive endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# Create a shared limiter instance
limiter = Limiter(key_func=get_remote_address)


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
