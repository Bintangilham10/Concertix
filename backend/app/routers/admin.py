"""
Admin API Router — Dashboard statistics and management endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.concert import Concert
from app.models.ticket import Ticket
from app.models.transaction import Transaction
from app.middleware.rbac import require_role
from app.services.blockchain_service import get_ticket_block, is_ticket_used


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


class AdminTicketScanBuyer(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class AdminTicketScanConcert(BaseModel):
    id: str
    name: str
    artist: str
    venue: str
    date: Optional[datetime] = None
    time: Optional[str] = None
    price: float


class AdminTicketScanBlock(BaseModel):
    index: int
    timestamp: Optional[datetime] = None
    action: str
    hash: str

    class Config:
        from_attributes = True


class AdminTicketScanResponse(BaseModel):
    id: str
    status: str
    created_at: Optional[datetime] = None
    buyer: AdminTicketScanBuyer
    concert: AdminTicketScanConcert
    blockchain_verified: bool
    blockchain_used: bool
    blockchain_records: int
    can_validate: bool
    validation_message: str
    blocks: List[AdminTicketScanBlock]


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


# ── Admin Transactions List ──────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/scan", response_model=AdminTicketScanResponse)
async def scan_ticket_detail(
    ticket_id: str,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Load ticket data for admin gate scan before validation."""
    ticket = (
        db.query(Ticket)
        .options(joinedload(Ticket.user), joinedload(Ticket.concert))
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan",
        )

    blocks = get_ticket_block(db, ticket_id)
    has_issued_block = any(block.action == "ISSUED" for block in blocks)
    blockchain_used = is_ticket_used(db, ticket_id)
    can_validate = ticket.status == "paid" and has_issued_block and not blockchain_used

    if ticket.status == "used" or blockchain_used:
        validation_message = "Tiket sudah dipakai dan tidak bisa diverifikasi ulang."
    elif ticket.status == "paid" and can_validate:
        validation_message = "Tiket valid, sudah lunas, dan siap diverifikasi masuk."
    elif ticket.status == "paid":
        validation_message = "Tiket sudah lunas, tetapi record ISSUED blockchain belum ditemukan."
    elif ticket.status == "pending":
        validation_message = "Tiket belum lunas. Jangan izinkan masuk."
    elif ticket.status == "cancelled":
        validation_message = "Tiket sudah dibatalkan. Jangan izinkan masuk."
    else:
        validation_message = "Status tiket belum dapat divalidasi."

    return AdminTicketScanResponse(
        id=ticket.id,
        status=ticket.status,
        created_at=ticket.created_at,
        buyer=AdminTicketScanBuyer(
            id=ticket.user.id,
            full_name=ticket.user.full_name,
            email=ticket.user.email,
        ),
        concert=AdminTicketScanConcert(
            id=ticket.concert.id,
            name=ticket.concert.name,
            artist=ticket.concert.artist,
            venue=ticket.concert.venue,
            date=ticket.concert.date,
            time=ticket.concert.time,
            price=ticket.concert.price,
        ),
        blockchain_verified=len(blocks) > 0,
        blockchain_used=blockchain_used,
        blockchain_records=len(blocks),
        can_validate=can_validate,
        validation_message=validation_message,
        blocks=[AdminTicketScanBlock.model_validate(block) for block in blocks],
    )


class AdminTransactionItem(BaseModel):
    id: str
    ticket_id: str
    amount: float
    status: str
    payment_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    concert_name: Optional[str] = None
    concert_artist: Optional[str] = None
    ticket_status: Optional[str] = None

    class Config:
        from_attributes = True


class AdminTransactionsResponse(BaseModel):
    transactions: List[AdminTransactionItem]
    total: int
    page: int
    per_page: int
    total_pages: int


@router.get("/transactions", response_model=AdminTransactionsResponse)
async def get_admin_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of all transactions (admin only).

    Supports filtering by status and searching by buyer name/email.
    """
    # Base query with joins
    base_query = (
        db.query(Transaction, Ticket, User, Concert)
        .join(Ticket, Transaction.ticket_id == Ticket.id)
        .join(User, Ticket.user_id == User.id)
        .join(Concert, Ticket.concert_id == Concert.id)
    )

    # Apply status filter
    if status_filter:
        base_query = base_query.filter(Transaction.status == status_filter)

    # Apply search filter (buyer name or email)
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    # Count total before pagination
    total = base_query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)

    # Apply pagination
    offset = (page - 1) * per_page
    results = (
        base_query
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )

    transactions = []
    for tx, ticket, user, concert in results:
        transactions.append(AdminTransactionItem(
            id=tx.id,
            ticket_id=tx.ticket_id,
            amount=tx.amount,
            status=tx.status,
            payment_type=tx.payment_type,
            created_at=tx.created_at,
            updated_at=tx.updated_at,
            buyer_name=user.full_name,
            buyer_email=user.email,
            concert_name=concert.name,
            concert_artist=concert.artist,
            ticket_status=ticket.status,
        ))

    return AdminTransactionsResponse(
        transactions=transactions,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


# ── Admin Users List ─────────────────────────────────────────────────────────

class AdminUserItem(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    total_tickets: int = 0
    total_spent: float = 0.0

    class Config:
        from_attributes = True


class AdminUsersResponse(BaseModel):
    users: List[AdminUserItem]
    total: int
    page: int
    per_page: int
    total_pages: int


@router.get("/users", response_model=AdminUsersResponse)
async def get_admin_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of all users (admin only).

    Supports filtering by role and searching by name/email.
    """
    base_query = db.query(User)

    if role:
        base_query = base_query.filter(User.role == role)

    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    total = base_query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)

    offset = (page - 1) * per_page
    users_raw = base_query.order_by(User.email.asc()).offset(offset).limit(per_page).all()

    users = []
    for u in users_raw:
        # Count tickets and total spent per user
        ticket_count = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.user_id == u.id)
            .scalar()
        ) or 0

        total_spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .join(Ticket, Transaction.ticket_id == Ticket.id)
            .filter(Ticket.user_id == u.id, Transaction.status == "success")
            .scalar()
        ) or 0.0

        users.append(AdminUserItem(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            total_tickets=ticket_count,
            total_spent=total_spent,
        ))

    return AdminUsersResponse(
        users=users,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )
