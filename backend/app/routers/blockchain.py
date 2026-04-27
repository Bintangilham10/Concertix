"""
Blockchain API Router — Endpoints for viewing and verifying the ticket blockchain.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.blockchain import Block
from app.models.ticket import Ticket
from app.middleware.auth_middleware import get_current_user
from app.middleware.rbac import require_role
from app.services.blockchain_service import (
    verify_chain_integrity,
    get_ticket_block,
    is_ticket_used,
    mark_ticket_used,
    get_latest_block,
    get_chain_length,
)

router = APIRouter()


# ── Response Schemas ─────────────────────────────────────────────────────────

class BlockResponse(BaseModel):
    id: str
    index: int
    timestamp: Optional[datetime] = None
    ticket_id: str
    user_id: str
    concert_id: str
    action: str
    data_hash: str
    previous_hash: str
    hash: str
    nonce: int

    class Config:
        from_attributes = True


class ChainVerificationResponse(BaseModel):
    valid: bool
    total_blocks: int
    errors: list[str]


class ChainInfoResponse(BaseModel):
    total_blocks: int
    latest_block_hash: Optional[str] = None
    latest_block_index: Optional[int] = None
    chain_valid: bool


class TicketBlockResponse(BaseModel):
    index: int
    timestamp: Optional[datetime] = None
    action: str
    hash: str

    class Config:
        from_attributes = True


class TicketBlockchainStatus(BaseModel):
    ticket_id: str
    is_on_blockchain: bool
    is_used: bool
    blocks: list[TicketBlockResponse]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/info", response_model=ChainInfoResponse)
async def get_chain_info(db: Session = Depends(get_db)):
    """Get blockchain overview information."""
    length = get_chain_length(db)
    latest = get_latest_block(db)
    verification = verify_chain_integrity(db)

    return ChainInfoResponse(
        total_blocks=length,
        latest_block_hash=latest.hash if latest else None,
        latest_block_index=latest.index if latest else None,
        chain_valid=verification["valid"],
    )


@router.get("/chain", response_model=List[BlockResponse])
async def get_full_chain(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Get the entire blockchain (paginated).

    Returns all blocks in order from genesis to latest.
    """
    blocks = (
        db.query(Block)
        .order_by(Block.index.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [BlockResponse.model_validate(b) for b in blocks]


@router.get("/verify", response_model=ChainVerificationResponse)
async def verify_blockchain(
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Verify the integrity of the entire blockchain.

    Checks hash chain linkage and genesis block validity.
    """
    result = verify_chain_integrity(db)
    return ChainVerificationResponse(**result)


@router.get("/ticket/{ticket_id}", response_model=TicketBlockchainStatus)
async def get_ticket_blockchain_status(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the blockchain status of a specific ticket.

    Shows all blocks related to this ticket and whether it has been used.
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

    blocks = get_ticket_block(db, ticket_id)
    used = is_ticket_used(db, ticket_id)

    return TicketBlockchainStatus(
        ticket_id=ticket_id,
        is_on_blockchain=len(blocks) > 0,
        is_used=used,
        blocks=[TicketBlockResponse.model_validate(b) for b in blocks],
    )


@router.post("/ticket/{ticket_id}/validate", response_model=BlockResponse)
async def validate_ticket(
    ticket_id: str,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Validate (mark as used) a ticket via blockchain.

    T12 Mitigation: This creates a USED block on the blockchain,
    preventing the ticket from being used again.
    """
    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id)
        .with_for_update()
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan",
        )
    if ticket.status == "used":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tiket sudah digunakan",
        )
    if ticket.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hanya tiket paid yang bisa divalidasi",
        )

    blocks = get_ticket_block(db, ticket_id)
    if not blocks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan di blockchain",
        )

    # Find the ISSUED block to get concert_id
    issued_block = next((b for b in blocks if b.action == "ISSUED"), None)
    if not issued_block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiket tidak memiliki record ISSUED di blockchain",
        )

    try:
        ticket.status = "used"
        used_block = mark_ticket_used(
            db,
            ticket_id=ticket_id,
            user_id=issued_block.user_id,
            concert_id=issued_block.concert_id,
        )
        db.refresh(used_block)
        return BlockResponse.model_validate(used_block)
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
