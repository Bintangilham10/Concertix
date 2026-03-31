"""
Blockchain Service — Lightweight In-House Blockchain for Ticket Integrity.

Implements a simple blockchain stored in PostgreSQL that provides:
- Immutable record of ticket issuance and usage (T12 mitigation)
- Cryptographic hash chain for tamper detection
- Chain integrity verification
- Proof-of-work (difficulty=2) to prevent trivial manipulation

This is an academic/lightweight implementation suitable for the DevSecOps project.
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.blockchain import Block

logger = logging.getLogger(__name__)

# Proof-of-work difficulty (number of leading zeros in hash)
DIFFICULTY = 2

# Max retries for race condition on concurrent block creation
MAX_RETRIES = 3


def _calculate_hash(index: int, timestamp: str, data: str, previous_hash: str, nonce: int) -> str:
    """Calculate SHA-256 hash for a block."""
    block_string = f"{index}{timestamp}{data}{previous_hash}{nonce}"
    return hashlib.sha256(block_string.encode()).hexdigest()


def _hash_ticket_data(ticket_id: str, user_id: str, concert_id: str, action: str) -> str:
    """Create a deterministic hash of the ticket data."""
    data = json.dumps({
        "ticket_id": ticket_id,
        "user_id": user_id,
        "concert_id": concert_id,
        "action": action,
    }, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()


def _proof_of_work(index: int, timestamp: str, data: str, previous_hash: str) -> tuple[int, str]:
    """
    Simple proof-of-work: find a nonce such that the hash starts with
    DIFFICULTY number of zeros.
    """
    nonce = 0
    while True:
        hash_value = _calculate_hash(index, timestamp, data, previous_hash, nonce)
        if hash_value[:DIFFICULTY] == "0" * DIFFICULTY:
            return nonce, hash_value
        nonce += 1


def get_latest_block(db: Session) -> Optional[Block]:
    """Get the latest block in the chain."""
    return db.query(Block).order_by(Block.index.desc()).first()


def get_chain_length(db: Session) -> int:
    """Get the total number of blocks in the chain."""
    return db.query(Block).count()


def create_genesis_block(db: Session) -> Block:
    """
    Create the genesis (first) block of the chain.
    Called automatically when the first ticket block is added.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    data_hash = hashlib.sha256(b"CONCERTIX_GENESIS_BLOCK").hexdigest()

    nonce, block_hash = _proof_of_work(
        index=0,
        timestamp=timestamp,
        data=data_hash,
        previous_hash="0" * 64,
    )

    genesis = Block(
        index=0,
        timestamp_raw=timestamp,  # Store raw string for hash verification
        ticket_id="GENESIS",
        user_id="SYSTEM",
        concert_id="SYSTEM",
        action="GENESIS",
        data_hash=data_hash,
        previous_hash="0" * 64,
        hash=block_hash,
        nonce=nonce,
    )
    db.add(genesis)
    db.commit()
    db.refresh(genesis)
    return genesis


def add_ticket_block(
    db: Session,
    ticket_id: str,
    user_id: str,
    concert_id: str,
    action: str = "ISSUED",
) -> Block:
    """
    Add a new block to the chain for a ticket event.

    Args:
        db: Database session
        ticket_id: The ticket being recorded
        user_id: The user who owns the ticket
        concert_id: The concert the ticket is for
        action: ISSUED, USED, or REVOKED

    Returns:
        The newly created Block

    Raises:
        RuntimeError: If block creation fails after MAX_RETRIES (race condition)
    """
    for attempt in range(MAX_RETRIES):
        try:
            latest_block = get_latest_block(db)

            # Auto-create genesis block if chain is empty
            if latest_block is None:
                latest_block = create_genesis_block(db)

            new_index = latest_block.index + 1
            timestamp = datetime.now(timezone.utc).isoformat()
            data_hash = _hash_ticket_data(ticket_id, user_id, concert_id, action)

            nonce, block_hash = _proof_of_work(
                index=new_index,
                timestamp=timestamp,
                data=data_hash,
                previous_hash=latest_block.hash,
            )

            new_block = Block(
                index=new_index,
                timestamp_raw=timestamp,  # Store raw string for hash verification
                ticket_id=ticket_id,
                user_id=user_id,
                concert_id=concert_id,
                action=action,
                data_hash=data_hash,
                previous_hash=latest_block.hash,
                hash=block_hash,
                nonce=nonce,
            )
            db.add(new_block)
            db.commit()
            db.refresh(new_block)
            return new_block

        except IntegrityError:
            db.rollback()
            logger.warning(
                f"Blockchain race condition on attempt {attempt + 1}/{MAX_RETRIES} "
                f"for ticket {ticket_id}. Retrying..."
            )
            if attempt == MAX_RETRIES - 1:
                raise RuntimeError(
                    f"Failed to add block for ticket {ticket_id} after {MAX_RETRIES} retries"
                )


def verify_chain_integrity(db: Session) -> dict:
    """
    Verify the entire blockchain integrity.

    Checks:
    1. Each block's hash is valid (recalculated matches stored hash)
    2. Each block's previous_hash matches the previous block's hash
    3. Genesis block has correct previous_hash of all zeros

    Returns:
        dict with 'valid' (bool), 'total_blocks' (int), 'errors' (list)
    """
    blocks = db.query(Block).order_by(Block.index.asc()).all()

    if not blocks:
        return {"valid": True, "total_blocks": 0, "errors": []}

    errors = []

    for i, block in enumerate(blocks):
        # Verify hash recalculation using stored raw timestamp
        timestamp_str = block.timestamp_raw or block.timestamp.isoformat()
        recalculated = _calculate_hash(
            block.index,
            timestamp_str,
            block.data_hash,
            block.previous_hash,
            block.nonce,
        )

        if recalculated != block.hash:
            errors.append(
                f"Block {block.index}: Hash mismatch! "
                f"Stored={block.hash[:16]}..., Recalculated={recalculated[:16]}..."
            )

        # Verify chain linkage
        if i == 0:
            if block.previous_hash != "0" * 64:
                errors.append(f"Block {block.index}: Genesis block has wrong previous_hash")
        else:
            if block.previous_hash != blocks[i - 1].hash:
                errors.append(
                    f"Block {block.index}: previous_hash mismatch. "
                    f"Expected {blocks[i-1].hash[:16]}..., got {block.previous_hash[:16]}..."
                )

    return {
        "valid": len(errors) == 0,
        "total_blocks": len(blocks),
        "errors": errors,
    }


def get_ticket_block(db: Session, ticket_id: str) -> list[Block]:
    """Get all blockchain records for a specific ticket."""
    return (
        db.query(Block)
        .filter(Block.ticket_id == ticket_id)
        .order_by(Block.index.asc())
        .all()
    )


def is_ticket_used(db: Session, ticket_id: str) -> bool:
    """Check if a ticket has been marked as USED in the blockchain."""
    used_block = (
        db.query(Block)
        .filter(Block.ticket_id == ticket_id, Block.action == "USED")
        .first()
    )
    return used_block is not None


def mark_ticket_used(db: Session, ticket_id: str, user_id: str, concert_id: str) -> Block:
    """
    Mark a ticket as used by adding a USED block to the chain.
    T12 Mitigation: Once used, the blockchain record prevents double-use.
    """
    if is_ticket_used(db, ticket_id):
        raise ValueError(f"Ticket {ticket_id} has already been used (blockchain verified)")

    return add_ticket_block(db, ticket_id, user_id, concert_id, action="USED")
