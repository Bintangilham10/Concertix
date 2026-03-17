"""
Midtrans Payment Gateway Integration (Placeholder).

This module will handle communication with the Midtrans API
for creating transactions and verifying webhook signatures.
"""

import hashlib
import hmac
from typing import Optional

from app.config import get_settings

settings = get_settings()


def create_snap_transaction(order_id: str, amount: float, customer_name: str, customer_email: str) -> dict:
    """
    Create a Midtrans Snap transaction.

    TODO: Implement actual Midtrans API call.
    Reference: https://docs.midtrans.com/docs/snap-api

    Returns:
        dict with 'token' and 'redirect_url' from Midtrans.
    """
    # Placeholder response
    return {
        "token": "placeholder-snap-token",
        "redirect_url": f"https://app.sandbox.midtrans.com/snap/v2/vtweb/placeholder-{order_id}",
    }


def verify_webhook_signature(
    order_id: str,
    status_code: str,
    gross_amount: str,
    signature_key: str,
) -> bool:
    """
    Verify Midtrans webhook HMAC signature.

    Signature = SHA512(order_id + status_code + gross_amount + server_key)

    Returns:
        True if the signature is valid.
    """
    raw = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    expected = hashlib.sha512(raw.encode()).hexdigest()
    return hmac.compare_digest(expected, signature_key)
