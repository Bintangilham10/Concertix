"""
Blockchain Model — Stores immutable ticket verification blocks in PostgreSQL.

Each block contains a hash chain linking it to the previous block,
creating a tamper-evident ledger for ticket integrity verification (T6, T12 mitigation).
"""

import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, func
from app.database import Base


class Block(Base):
    __tablename__ = "blockchain"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    index = Column(Integer, nullable=False, unique=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    timestamp_raw = Column(String, nullable=True)  # Exact ISO string used for hashing

    # Ticket data embedded in block
    ticket_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    concert_id = Column(String, nullable=False)
    action = Column(String, nullable=False, default="ISSUED")  # ISSUED, USED, REVOKED

    # Blockchain integrity fields
    data_hash = Column(String, nullable=False)       # SHA-256 of ticket data
    previous_hash = Column(String, nullable=False)    # Hash of the previous block
    hash = Column(String, nullable=False, unique=True) # Hash of this block
    nonce = Column(Integer, nullable=False, default=0) # Proof-of-work nonce
