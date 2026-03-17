from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ticket import Ticket
from app.models.concert import Concert
from app.models.user import User
from app.schemas.ticket import TicketOrderRequest, TicketResponse
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.post("/order", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def order_ticket(
    order: TicketOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Order a ticket for a concert."""
    # Check concert exists
    concert = db.query(Concert).filter(Concert.id == order.concert_id).first()
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

    # Create ticket
    ticket = Ticket(
        user_id=current_user.id,
        concert_id=concert.id,
        status="pending",
    )
    db.add(ticket)

    # Reduce available tickets
    concert.available_tickets -= order.quantity
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
