import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Enum as SAEnum, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("ticket_id", name="uq_transactions_ticket_id"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String, ForeignKey("tickets.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(
        SAEnum("pending", "success", "failed", "expired", "refunded", name="transaction_status"),
        default="pending",
        nullable=False,
    )
    midtrans_transaction_id = Column(String, nullable=True)
    payment_type = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    ticket = relationship("Ticket", back_populates="transaction")
