from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ticket import Ticket
from app.models.concert import Concert
from app.models.user import User
from app.schemas.ticket import TicketOrderRequest, TicketResponse
from app.middleware.auth_middleware import get_current_user

# Blockchain integration (Week 3)
try:
    from app.services.blockchain_service import get_ticket_block, is_ticket_used
    BLOCKCHAIN_ENABLED = True
except ImportError:
    BLOCKCHAIN_ENABLED = False

router = APIRouter()


@router.post("/order", status_code=status.HTTP_201_CREATED)
async def order_ticket(
    order: TicketOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Order ticket(s) for a concert."""
    db.query(User).filter(User.id == current_user.id).with_for_update().first()

    active_ticket = (
        db.query(Ticket)
        .filter(
            Ticket.user_id == current_user.id,
            Ticket.status.in_(["pending", "paid", "used"]),
        )
        .first()
    )
    if active_ticket:
        if active_ticket.status == "pending":
            detail = "Akun ini sudah memiliki tiket pending. Batalkan tiket pending terlebih dahulu untuk memilih tiket lain."
        else:
            detail = "Setiap akun hanya dapat memiliki 1 tiket."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    concert = (
        db.query(Concert)
        .filter(Concert.id == order.concert_id)
        .with_for_update()
        .first()
    )
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konser tidak ditemukan",
        )

    # Check ticket availability
    if concert.available_tickets < order.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiket tidak tersedia atau kuota habis",
        )

    # Create one ticket record per quantity unit
    tickets = []
    for _ in range(order.quantity):
        ticket = (
            db.query(Ticket)
            .filter(
                Ticket.user_id == current_user.id,
                Ticket.concert_id == concert.id,
                Ticket.status == "cancelled",
            )
            .with_for_update()
            .first()
        )
        if ticket:
            ticket.status = "pending"
        else:
            ticket = Ticket(
                user_id=current_user.id,
                concert_id=concert.id,
                status="pending",
            )
            db.add(ticket)
        tickets.append(ticket)

    # Reduce available tickets
    concert.available_tickets -= order.quantity
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setiap user hanya dapat memesan 1 tiket untuk konser ini",
        )

    for t in tickets:
        db.refresh(t)

    # Return single ticket if qty=1, list if qty>1
    if len(tickets) == 1:
        return tickets[0]
    return tickets


@router.post("/{ticket_id}/cancel", response_model=TicketResponse)
async def cancel_pending_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel the current user's pending ticket and release its quota."""
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
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
            detail="Hanya tiket pending yang dapat dibatalkan",
        )

    concert = (
        db.query(Concert)
        .filter(Concert.id == ticket.concert_id)
        .with_for_update()
        .first()
    )
    if concert:
        concert.available_tickets = min(concert.quota, concert.available_tickets + 1)

    if ticket.transaction and ticket.transaction.status == "pending":
        ticket.transaction.status = "expired"

    ticket.status = "cancelled"
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/my-tickets", response_model=List[TicketResponse])
async def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all tickets for the current user."""
    tickets = (
        db.query(Ticket)
        .filter(Ticket.user_id == current_user.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    return tickets


@router.get("/{ticket_id}/verify")
async def verify_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify a ticket's blockchain status.

    T6/T12 Mitigation: Check if ticket is authentic (on blockchain)
    and whether it has already been used (prevents double-use).
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan",
        )

    if current_user.role != "admin" and ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak untuk tiket ini",
        )

    result = {
        "ticket_id": ticket.id,
        "status": ticket.status,
        "blockchain_verified": False,
        "blockchain_used": False,
    }

    if BLOCKCHAIN_ENABLED:
        blocks = get_ticket_block(db, ticket_id)
        result["blockchain_verified"] = len(blocks) > 0
        result["blockchain_used"] = is_ticket_used(db, ticket_id)
        result["blockchain_records"] = len(blocks)

    return result


@router.get("/{ticket_id}/pdf")
async def download_ticket_pdf(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download a PDF e-ticket.

    Only the ticket owner can download their ticket.
    The ticket must be in 'paid' or 'used' status.
    """
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id, Ticket.user_id == current_user.id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan",
        )

    if ticket.status not in ("paid", "used"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiket belum dibayar, tidak bisa diunduh",
        )

    concert = db.query(Concert).filter(Concert.id == ticket.concert_id).first()
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data konser tidak ditemukan",
        )

    # Format date for display
    concert_date_str = concert.date.strftime("%d %B %Y") if concert.date else "-"

    from app.services.ticket_pdf_service import generate_ticket_pdf

    pdf_bytes = generate_ticket_pdf(
        ticket_id=ticket.id,
        concert_name=concert.name,
        concert_artist=concert.artist,
        concert_venue=concert.venue,
        concert_date=concert_date_str,
        concert_time=concert.time,
        concert_price=concert.price,
        buyer_name=current_user.full_name,
        buyer_email=current_user.email,
        ticket_status=ticket.status,
    )

    filename = f"concertix-ticket-{ticket.id[:8]}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
