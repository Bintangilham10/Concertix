from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.concert import Concert
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.concert import ConcertCreate, ConcertListResponse, ConcertUpdate, ConcertResponse
from app.middleware.rbac import require_role  # T10: Use generic RBAC middleware
from app.middleware.rate_limiter import limiter  # T4: Rate limiting

router = APIRouter()

UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


@router.get("/", response_model=ConcertListResponse)
@limiter.limit("30/minute")
async def list_concerts(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get paginated list of concerts (public)."""
    total = db.query(func.count(Concert.id)).scalar() or 0
    total_pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page
    concerts = (
        db.query(Concert)
        .order_by(Concert.date.asc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return ConcertListResponse(
        items=concerts,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{concert_id}", response_model=ConcertResponse)
@limiter.limit("30/minute")
async def get_concert(
    request: Request,
    concert_id: str = Path(..., min_length=36, max_length=36, pattern=UUID_PATTERN),
    db: Session = Depends(get_db),
):
    """Get a single concert by ID (public)."""
    concert = db.query(Concert).filter(Concert.id == concert_id).first()
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konser tidak ditemukan",
        )
    return concert


@router.post("/", response_model=ConcertResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_concert(
    request: Request,
    concert_data: ConcertCreate,
    admin: User = Depends(require_role("admin")),  # T10: RBAC
    db: Session = Depends(get_db),
):
    """Create a new concert (admin only)."""
    new_concert = Concert(
        **concert_data.model_dump(),
        available_tickets=concert_data.quota,
    )
    db.add(new_concert)
    db.commit()
    db.refresh(new_concert)
    return new_concert


@router.put("/{concert_id}", response_model=ConcertResponse)
@limiter.limit("10/minute")
async def update_concert(
    request: Request,
    concert_data: ConcertUpdate,
    concert_id: str = Path(..., min_length=36, max_length=36, pattern=UUID_PATTERN),
    admin: User = Depends(require_role("admin")),  # T10: RBAC
    db: Session = Depends(get_db),
):
    """Update a concert (admin only)."""
    concert = db.query(Concert).filter(Concert.id == concert_id).first()
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konser tidak ditemukan",
        )

    update_data = concert_data.model_dump(exclude_unset=True)
    if "quota" in update_data:
        sold_tickets = concert.quota - concert.available_tickets
        if update_data["quota"] < sold_tickets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kuota tidak boleh lebih kecil dari tiket yang sudah terjual/dipesan",
            )
        concert.available_tickets = update_data["quota"] - sold_tickets

    for field, value in update_data.items():
        setattr(concert, field, value)

    db.commit()
    db.refresh(concert)
    return concert


@router.delete("/{concert_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def delete_concert(
    request: Request,
    concert_id: str = Path(..., min_length=36, max_length=36, pattern=UUID_PATTERN),
    admin: User = Depends(require_role("admin")),  # T10: RBAC
    db: Session = Depends(get_db),
):
    """Delete a concert (admin only)."""
    concert = db.query(Concert).filter(Concert.id == concert_id).first()
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konser tidak ditemukan",
        )

    has_tickets = (
        db.query(Ticket)
        .filter(Ticket.concert_id == concert_id)
        .first()
    )
    if has_tickets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konser tidak bisa dihapus karena sudah memiliki tiket/transaksi",
        )

    db.delete(concert)
    db.commit()
