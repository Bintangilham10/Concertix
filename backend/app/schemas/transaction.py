from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentCreateRequest(BaseModel):
    ticket_id: str


class PaymentWebhookPayload(BaseModel):
    """Midtrans webhook notification payload (simplified)."""
    order_id: str
    transaction_status: str
    payment_type: Optional[str] = None
    gross_amount: Optional[str] = None
    signature_key: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    ticket_id: str
    amount: float
    status: str
    midtrans_transaction_id: Optional[str] = None
    payment_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
