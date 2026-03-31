from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.concert import Concert
from app.models.user import User
from app.schemas.concert import ConcertCreate, ConcertUpdate, ConcertResponse
from app.middleware.rbac import require_role  # T10: Use generic RBAC middleware

router = APIRouter()


@router.get("/", response_model=List[ConcertResponse])
async def list_concerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get paginated list of concerts (public)."""
    offset = (page - 1) * per_page
    concerts = db.query(Concert).offset(offset).limit(per_page).all()
    return concerts


@router.get("/{concert_id}", response_model=ConcertResponse)
async def get_concert(concert_id: str, db: Session = Depends(get_db)):
    """Get a single concert by ID (public)."""
    concert = db.query(Concert).filter(Concert.id == concert_id).first()
    if not concert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konser tidak ditemukan",
        )
    return concert


@router.post("/", response_model=ConcertResponse, status_code=status.HTTP_201_CREATED)
async def create_concert(
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
async def update_concert(
    concert_id: str,
    concert_data: ConcertUpdate,
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
    for field, value in update_data.items():
        setattr(concert, field, value)

    db.commit()
    db.refresh(concert)
    return concert


@router.delete("/{concert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_concert(
    concert_id: str,
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

    db.delete(concert)
    db.commit()
