from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ticket import Ticket
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import PaymentCreateRequest, PaymentWebhookPayload, TransactionResponse
from app.middleware.auth_middleware import get_current_user
from app.services.payment_service import create_snap_transaction, verify_webhook_signature

router = APIRouter()


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

    # Create transaction record
    transaction = Transaction(
        ticket_id=ticket.id,
        amount=amount,
        status="pending",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Call Midtrans (placeholder)
    midtrans_response = create_snap_transaction(
        order_id=transaction.id,
        amount=amount,
        customer_name=current_user.full_name,
        customer_email=current_user.email,
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
    # Verify signature (when Midtrans keys are configured)
    # if payload.signature_key:
    #     is_valid = verify_webhook_signature(
    #         payload.order_id, "200", payload.gross_amount or "0", payload.signature_key
    #     )
    #     if not is_valid:
    #         raise HTTPException(status_code=403, detail="Invalid signature")

    # Find transaction
    transaction = db.query(Transaction).filter(Transaction.id == payload.order_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi tidak ditemukan",
        )

    # Update transaction status based on Midtrans status
    status_mapping = {
        "capture": "success",
        "settlement": "success",
        "pending": "pending",
        "deny": "failed",
        "cancel": "failed",
        "expire": "expired",
        "refund": "refunded",
    }

    new_status = status_mapping.get(payload.transaction_status, "pending")
    transaction.status = new_status
    transaction.payment_type = payload.payment_type
    transaction.midtrans_transaction_id = payload.order_id

    # Update ticket status if payment is successful
    if new_status == "success":
        ticket = transaction.ticket
        ticket.status = "paid"
        # TODO: Generate QR code for the ticket

    db.commit()

    return {"status": "ok"}
