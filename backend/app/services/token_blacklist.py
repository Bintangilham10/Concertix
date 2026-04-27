"""
Token Blacklist Service — Redis-backed JWT token revocation.

T1 Mitigation: When a user logs out, their token is added to a Redis blacklist
so it cannot be reused, even if it hasn't expired yet.
"""

import redis
from typing import Optional
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Redis connection (lazy init)
_redis_client: Optional[redis.Redis] = None


def _get_redis() -> Optional[redis.Redis]:
    """Get or create Redis connection (returns None if unavailable)."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            _redis_client.ping()  # Test connection
        except (redis.ConnectionError, redis.TimeoutError) as exc:
            logger.warning("Redis token blacklist unavailable: %s", exc)
            _redis_client = None
    return _redis_client


def blacklist_token(token: str, ttl_seconds: int = 1800) -> bool:
    """
    Add a JWT token to the blacklist.

    Args:
        token: The JWT token string to blacklist
        ttl_seconds: Time-to-live in seconds (default: 30 min = JWT expiry)

    Returns:
        True if successfully blacklisted, False if Redis unavailable
    """
    client = _get_redis()
    if client is None:
        logger.warning("Token blacklist write skipped because Redis is unavailable")
        return False

    try:
        # Store with prefix for namespace isolation
        client.setex(f"blacklist:{token}", ttl_seconds, "revoked")
        return True
    except redis.RedisError as exc:
        logger.warning("Token blacklist write failed: %s", exc)
        return False


def is_token_blacklisted(token: str) -> bool:
    """
    Check if a JWT token has been blacklisted (i.e., user logged out).

    Returns:
        True if the token is blacklisted, False otherwise
    """
    client = _get_redis()
    if client is None:
        return settings.TOKEN_BLACKLIST_FAIL_CLOSED

    try:
        return client.exists(f"blacklist:{token}") > 0
    except redis.RedisError as exc:
        logger.warning("Token blacklist lookup failed: %s", exc)
        return settings.TOKEN_BLACKLIST_FAIL_CLOSED
