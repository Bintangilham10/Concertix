import uuid
from sqlalchemy import Column, String, ForeignKey, Enum as SAEnum, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("user_id", "concert_id", name="uq_tickets_user_concert"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    concert_id = Column(String, ForeignKey("concerts.id"), nullable=False)
    qr_code = Column(String, nullable=True)
    status = Column(
        SAEnum("pending", "paid", "used", "cancelled", name="ticket_status"),
        default="pending",
        nullable=False,
    )
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="tickets")
    concert = relationship("Concert", back_populates="tickets")
    transaction = relationship("Transaction", back_populates="ticket", uselist=False)
