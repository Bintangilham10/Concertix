import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from app.database import Base


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    __table_args__ = (
        Index("ix_payment_attempts_transaction_current", "transaction_id", "is_current"),
        Index("ix_payment_attempts_ticket_id", "ticket_id"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False)
    ticket_id = Column(String, ForeignKey("tickets.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(
        SAEnum(
            "pending",
            "success",
            "failed",
            "expired",
            "refunded",
            name="payment_attempt_status",
        ),
        default="pending",
        nullable=False,
    )
    is_current = Column(Boolean, default=True, nullable=False)
    midtrans_transaction_id = Column(String, nullable=True)
    payment_type = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    transaction = relationship("Transaction", back_populates="payment_attempts")
    ticket = relationship("Ticket")
