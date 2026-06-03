from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


class PaymentCreateRequest(BaseModel):
    ticket_id: str = Field(..., min_length=36, max_length=36, pattern=UUID_PATTERN)


class PaymentWebhookPayload(BaseModel):
    """Midtrans webhook notification payload (simplified)."""
    order_id: str = Field(..., min_length=1, max_length=64)
    transaction_status: str = Field(..., min_length=1, max_length=32)
    status_code: Optional[str] = Field(default=None, max_length=8)
    fraud_status: Optional[str] = Field(default=None, max_length=32)
    transaction_id: Optional[str] = Field(default=None, max_length=64)
    payment_type: Optional[str] = Field(default=None, max_length=64)
    gross_amount: Optional[str] = Field(default=None, max_length=32)
    signature_key: Optional[str] = Field(default=None, max_length=128)


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
