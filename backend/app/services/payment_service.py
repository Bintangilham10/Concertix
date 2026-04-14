"""
Midtrans Payment Gateway Integration.

Supports two modes:
- SANDBOX: When MIDTRANS_SERVER_KEY is configured, calls the real Midtrans Sandbox API.
- SIMULATION: When no server key is set, returns a simulated response for local development.

Reference: https://docs.midtrans.com/docs/snap-api
"""

import base64
import hashlib
import hmac
import logging

import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Midtrans Snap API endpoints
MIDTRANS_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions"
MIDTRANS_PRODUCTION_URL = "https://app.midtrans.com/snap/v1/transactions"


def _get_snap_url() -> str:
    """Return the correct Midtrans Snap URL based on environment."""
    if settings.MIDTRANS_IS_PRODUCTION:
        return MIDTRANS_PRODUCTION_URL
    return MIDTRANS_SANDBOX_URL


def _get_auth_header() -> str:
    """Create Base64-encoded auth header from server key."""
    key = f"{settings.MIDTRANS_SERVER_KEY}:"
    return base64.b64encode(key.encode()).decode()


def create_snap_transaction(
    order_id: str,
    amount: float,
    customer_name: str,
    customer_email: str,
) -> dict:
    """
    Create a Midtrans Snap transaction.

    If MIDTRANS_SERVER_KEY is configured, calls the real Midtrans API.
    Otherwise, returns a simulation response for local dev/testing.

    Returns:
        dict with 'token' and 'redirect_url'.
    """
    # ── Simulation mode (no server key) ──
    if not settings.MIDTRANS_SERVER_KEY or settings.MIDTRANS_SERVER_KEY.startswith("your_"):
        logger.info(
            f"[SIMULATION] Payment created for order {order_id}, "
            f"amount={amount}, customer={customer_email}"
        )
        return {
            "token": f"sim-token-{order_id[:8]}",
            "redirect_url": f"https://app.sandbox.midtrans.com/snap/v2/vtweb/sim-{order_id[:8]}",
        }

    # ── Real Midtrans API call ──
    payload = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": int(amount),  # Midtrans expects integer
        },
        "customer_details": {
            "first_name": customer_name,
            "email": customer_email,
        },
        "callbacks": {
            "finish": f"{settings.CORS_ALLOWED_ORIGIN}/my-tickets",
        },
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Basic {_get_auth_header()}",
    }

    try:
        response = httpx.post(
            _get_snap_url(),
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

        logger.info(f"Midtrans snap token created for order {order_id}")

        return {
            "token": data.get("token", ""),
            "redirect_url": data.get("redirect_url", ""),
        }

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Midtrans API error for order {order_id}: "
            f"{e.response.status_code} - {e.response.text}"
        )
        raise RuntimeError(f"Payment gateway error: {e.response.status_code}")

    except httpx.RequestError as e:
        logger.error(f"Midtrans connection error for order {order_id}: {e}")
        raise RuntimeError("Cannot connect to payment gateway")


def verify_webhook_signature(
    order_id: str,
    status_code: str,
    gross_amount: str,
    signature_key: str,
) -> bool:
    """
    Verify Midtrans webhook HMAC-SHA512 signature.

    Signature = SHA512(order_id + status_code + gross_amount + server_key)

    Returns:
        True if the signature is valid.
    """
    raw = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    expected = hashlib.sha512(raw.encode()).hexdigest()
    return hmac.compare_digest(expected, signature_key)
