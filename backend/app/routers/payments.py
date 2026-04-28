from decimal import Decimal, InvalidOperation
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.blockchain import Block
from app.models.payment_attempt import PaymentAttempt
from app.models.ticket import Ticket
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import PaymentCreateRequest, PaymentWebhookPayload
from app.middleware.auth_middleware import get_current_user
from app.middleware.rate_limiter import limiter
from app.services.payment_service import create_snap_transaction, verify_webhook_signature

# Blockchain integration (Week 3)
try:
    from app.services.blockchain_service import add_ticket_block
    BLOCKCHAIN_ENABLED = True
except ImportError:
    BLOCKCHAIN_ENABLED = False

router = APIRouter()
logger = logging.getLogger(__name__)


def _map_midtrans_status(payload: PaymentWebhookPayload) -> str:
    """Map Midtrans notification status to the local transaction status enum."""
    status_mapping = {
        "settlement": "success",
        "pending": "pending",
        "deny": "failed",
        "cancel": "failed",
        "expire": "expired",
        "refund": "refunded",
    }

    if payload.transaction_status == "capture":
        if payload.fraud_status and payload.fraud_status != "accept":
            return "pending"
        return "success"

    return status_mapping.get(payload.transaction_status, "pending")


def _record_issued_block_once(db: Session, ticket: Ticket) -> None:
    """Record the paid ticket on the local blockchain if it is not recorded yet."""
    if not BLOCKCHAIN_ENABLED:
        return

    try:
        existing_issued_block = (
            db.query(Block)
            .filter(Block.ticket_id == str(ticket.id), Block.action == "ISSUED")
            .first()
        )
        if existing_issued_block is None:
            add_ticket_block(
                db=db,
                ticket_id=str(ticket.id),
                user_id=str(ticket.user_id),
                concert_id=str(ticket.concert_id),
                action="ISSUED",
            )
    except Exception as exc:
        # Payment is the source of truth; blockchain failure must be visible but
        # should not make a settled payment fail after Midtrans has accepted it.
        logger.error("Blockchain recording failed for ticket %s: %s", ticket.id, exc)


@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_payment(
    request: Request,
    payment_data: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment for a ticket via Midtrans."""
    # Find the ticket
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == payment_data.ticket_id, Ticket.user_id == current_user.id)
        .with_for_update()
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan",
        )

    if ticket.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiket sudah dibayar atau dibatalkan",
        )

    # Get concert price
    concert = ticket.concert
    amount = concert.price

    transaction = (
        db.query(Transaction)
        .filter(Transaction.ticket_id == ticket.id)
        .with_for_update()
        .first()
    )
    if transaction is None:
        transaction = Transaction(
            ticket_id=ticket.id,
            amount=amount,
            status="pending",
        )
        db.add(transaction)
        db.flush()
    elif transaction.status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaksi tiket sudah berhasil",
        )
    else:
        transaction.amount = amount
        transaction.status = "pending"
        transaction.midtrans_transaction_id = None
        transaction.payment_type = None

    (
        db.query(PaymentAttempt)
        .filter(
            PaymentAttempt.transaction_id == transaction.id,
            PaymentAttempt.is_current.is_(True),
        )
        .update({"is_current": False}, synchronize_session=False)
    )
    payment_attempt = PaymentAttempt(
        transaction_id=transaction.id,
        ticket_id=ticket.id,
        amount=amount,
        status="pending",
        is_current=True,
    )
    db.add(payment_attempt)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaksi tiket sedang diproses. Silakan coba lagi.",
        )

    db.refresh(payment_attempt)

    try:
        midtrans_response = create_snap_transaction(
            order_id=payment_attempt.id,
            amount=amount,
            customer_name=current_user.full_name,
            customer_email=current_user.email,
        )
    except RuntimeError as exc:
        payment_attempt.status = "failed"
        payment_attempt.is_current = False
        transaction.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    return {
        "transaction_id": payment_attempt.id,
        "snap_token": midtrans_response["token"],
        "redirect_url": midtrans_response["redirect_url"],
    }


@router.post("/webhook")
@limiter.limit("60/minute")
async def payment_webhook(
    request: Request,
    payload: PaymentWebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Handle Midtrans payment notification webhook.

    Midtrans sends POST to this endpoint when payment status changes.
    """
    # T3 Mitigation: Verify Midtrans webhook signature (HMAC-SHA512)
    # In production (MIDTRANS_SERVER_KEY set), signature is REQUIRED.
    # In dev mode (no server key), unsigned webhooks are allowed for testing.
    from app.config import get_settings
    _settings = get_settings()
    has_server_key = bool(_settings.MIDTRANS_SERVER_KEY) and not _settings.MIDTRANS_SERVER_KEY.startswith("your_")

    if payload.signature_key:
        if not payload.status_code or not payload.gross_amount:
            raise HTTPException(
                status_code=403,
                detail="Signed webhook must include status_code and gross_amount",
            )

        is_valid = verify_webhook_signature(
            payload.order_id,
            payload.status_code,
            payload.gross_amount,
            payload.signature_key,
        )
        if not is_valid:
            raise HTTPException(status_code=403, detail="Invalid webhook signature")
    elif has_server_key:
        # Server key configured but no signature provided → reject
        raise HTTPException(
            status_code=403,
            detail="Webhook signature required but not provided"
        )

    payment_attempt = (
        db.query(PaymentAttempt)
        .filter(PaymentAttempt.id == payload.order_id)
        .with_for_update()
        .first()
    )

    if payment_attempt:
        transaction = (
            db.query(Transaction)
            .filter(Transaction.id == payment_attempt.transaction_id)
            .with_for_update()
            .first()
        )
    else:
        # Backward compatibility for payment orders created before payment_attempts.
        transaction = (
            db.query(Transaction)
            .filter(Transaction.id == payload.order_id)
            .with_for_update()
            .first()
        )

    if not transaction:
        logger.warning(
            "Ignoring Midtrans webhook for unknown or superseded order_id %s",
            payload.order_id,
        )
        return {"status": "ok", "ignored": True, "reason": "transaction_not_found"}

    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == transaction.ticket_id)
        .with_for_update()
        .first()
    )
    if not ticket:
        logger.warning(
            "Ignoring Midtrans webhook for transaction %s without ticket",
            transaction.id,
        )
        return {"status": "ok", "ignored": True, "reason": "ticket_not_found"}

    new_status = _map_midtrans_status(payload)

    if payment_attempt:
        payment_attempt.status = new_status
        payment_attempt.payment_type = payload.payment_type
        payment_attempt.midtrans_transaction_id = payload.transaction_id or payload.order_id

    if ticket.status == "cancelled":
        logger.info(
            "Ignoring Midtrans webhook for cancelled ticket %s on order %s",
            transaction.ticket_id,
            payload.order_id,
        )
        db.commit()
        return {"status": "ok", "ignored": True, "reason": "ticket_cancelled"}

    if payment_attempt and not payment_attempt.is_current:
        logger.info(
            "Ignoring Midtrans webhook for non-current payment attempt %s",
            payload.order_id,
        )
        db.commit()
        return {"status": "ok", "ignored": True, "reason": "non_current_attempt"}

    if payload.gross_amount is not None:
        try:
            paid_amount = Decimal(str(payload.gross_amount))
            expected_amount = Decimal(
                str(payment_attempt.amount if payment_attempt else transaction.amount)
            )
        except (InvalidOperation, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment amount",
            )

        if paid_amount != expected_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount does not match transaction",
            )

    was_success = transaction.status == "success"

    if new_status == "success" and payload.status_code and payload.status_code != "200":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Successful payment webhook must use status_code 200",
        )

    if was_success and new_status in {"pending", "failed", "expired"}:
        logger.info(
            "Ignoring non-terminal Midtrans webhook for already successful order %s",
            payload.order_id,
        )
        db.commit()
        return {"status": "ok", "ignored": True}

    transaction.status = new_status
    transaction.payment_type = payload.payment_type
    transaction.midtrans_transaction_id = payload.transaction_id or payload.order_id

    # Update ticket status if payment is successful
    if new_status == "success":
        ticket.status = "paid"
        if payment_attempt:
            payment_attempt.is_current = False
        if not was_success:
            _record_issued_block_once(db, ticket)

    db.commit()

    return {"status": "ok"}
