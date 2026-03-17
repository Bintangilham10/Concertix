from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.schemas.concert import ConcertResponse


class TicketOrderRequest(BaseModel):
    concert_id: str
    quantity: int = 1


class TicketResponse(BaseModel):
    id: str
    user_id: str
    concert_id: str
    concert: Optional[ConcertResponse] = None
    qr_code: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
