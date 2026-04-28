from decimal import Decimal, InvalidOperation
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.blockchain import Block
from app.models.ticket import Ticket
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import PaymentCreateRequest, PaymentWebhookPayload, TransactionResponse
from app.middleware.auth_middleware import get_current_user
from app.services.payment_service import create_snap_transaction, verify_webhook_signature

# Blockchain integration (Week 3)
try:
    from app.services.blockchain_service import add_ticket_block
    BLOCKCHAIN_ENABLED = True
except ImportError:
    BLOCKCHAIN_ENABLED = False

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_payment(
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
    elif transaction.status == "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaksi tiket sudah berhasil",
        )
    else:
        transaction.amount = amount
        if transaction.status in {"failed", "expired"}:
            transaction.status = "pending"

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        transaction = (
            db.query(Transaction)
            .filter(Transaction.ticket_id == ticket.id)
            .first()
        )
        if transaction is None:
            raise
    db.refresh(transaction)

    try:
        midtrans_response = create_snap_transaction(
            order_id=transaction.id,
            amount=amount,
            customer_name=current_user.full_name,
            customer_email=current_user.email,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    return {
        "transaction_id": transaction.id,
        "snap_token": midtrans_response["token"],
        "redirect_url": midtrans_response["redirect_url"],
    }


@router.post("/webhook")
async def payment_webhook(
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

    # Find transaction
    transaction = db.query(Transaction).filter(Transaction.id == payload.order_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi tidak ditemukan",
        )

    if transaction.ticket and transaction.ticket.status == "cancelled":
        logger.info(
            "Ignoring Midtrans webhook for cancelled ticket %s on order %s",
            transaction.ticket_id,
            transaction.id,
        )
        return {"status": "ok", "ignored": True, "reason": "ticket_cancelled"}

    if payload.gross_amount is not None:
        try:
            paid_amount = Decimal(str(payload.gross_amount))
            expected_amount = Decimal(str(transaction.amount))
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

    # Update transaction status based on Midtrans status
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
            new_status = "pending"
        else:
            new_status = "success"
    else:
        new_status = status_mapping.get(payload.transaction_status, "pending")

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
        return {"status": "ok", "ignored": True}

    transaction.status = new_status
    transaction.payment_type = payload.payment_type
    transaction.midtrans_transaction_id = payload.transaction_id or payload.order_id

    # Update ticket status if payment is successful
    if new_status == "success":
        ticket = transaction.ticket
        ticket.status = "paid"

        # T12 Mitigation: Record ticket issuance on blockchain
        if BLOCKCHAIN_ENABLED and not was_success:
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
            except Exception as e:
                # Don't fail payment if blockchain recording fails,
                # but log so it's visible in monitoring/Grafana
                logger.error(
                    f"Blockchain recording failed for ticket {ticket.id}: {e}"
                )

    db.commit()

    return {"status": "ok"}
