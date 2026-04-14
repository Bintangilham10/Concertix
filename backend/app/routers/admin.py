"""
Admin API Router — Dashboard statistics and management endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.concert import Concert
from app.models.ticket import Ticket
from app.models.transaction import Transaction
from app.middleware.rbac import require_role


router = APIRouter()


# ── Response Schemas ─────────────────────────────────────────────────────────

class ConcertStat(BaseModel):
    id: str
    name: str
    artist: str
    venue: str
    date: Optional[datetime] = None
    price: float
    quota: int
    available_tickets: int
    tickets_sold: int

    class Config:
        from_attributes = True


class RecentTransaction(BaseModel):
    id: str
    ticket_id: str
    amount: float
    status: str
    payment_type: Optional[str] = None
    created_at: Optional[datetime] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    concert_name: Optional[str] = None

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_concerts: int
    total_tickets_sold: int
    total_revenue: float
    total_users: int
    concerts: List[ConcertStat]
    recent_transactions: List[RecentTransaction]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Get dashboard statistics for the admin panel.

    Returns aggregate counts and recent transaction data.
    Requires admin role.
    """
    # 1. Total concerts
    total_concerts = db.query(func.count(Concert.id)).scalar() or 0

    # 2. Total tickets sold (status = paid or used)
    total_tickets_sold = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status.in_(["paid", "used"]))
        .scalar()
    ) or 0

    # 3. Total revenue (sum of successful transactions)
    total_revenue = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.status == "success")
        .scalar()
    ) or 0.0

    # 4. Total users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # 5. Per-concert stats
    concerts_raw = db.query(Concert).order_by(Concert.date.desc()).all()
    concerts = []
    for c in concerts_raw:
        sold = c.quota - c.available_tickets
        concerts.append(ConcertStat(
            id=c.id,
            name=c.name,
            artist=c.artist,
            venue=c.venue,
            date=c.date,
            price=c.price,
            quota=c.quota,
            available_tickets=c.available_tickets,
            tickets_sold=sold,
        ))

    # 6. Recent transactions (last 10)
    recent_txs_raw = (
        db.query(Transaction, Ticket, User, Concert)
        .join(Ticket, Transaction.ticket_id == Ticket.id)
        .join(User, Ticket.user_id == User.id)
        .join(Concert, Ticket.concert_id == Concert.id)
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )

    recent_transactions = []
    for tx, ticket, user, concert in recent_txs_raw:
        recent_transactions.append(RecentTransaction(
            id=tx.id,
            ticket_id=tx.ticket_id,
            amount=tx.amount,
            status=tx.status,
            payment_type=tx.payment_type,
            created_at=tx.created_at,
            buyer_name=user.full_name,
            buyer_email=user.email,
            concert_name=concert.name,
        ))

    return AdminStatsResponse(
        total_concerts=total_concerts,
        total_tickets_sold=total_tickets_sold,
        total_revenue=total_revenue,
        total_users=total_users,
        concerts=concerts,
        recent_transactions=recent_transactions,
    )
