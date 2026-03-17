import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Float
from sqlalchemy.orm import relationship

from app.database import Base


class Concert(Base):
    __tablename__ = "concerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    venue = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    time = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    quota = Column(Integer, nullable=False)
    available_tickets = Column(Integer, nullable=False)
    image_url = Column(String, nullable=True)

    # Relationships
    tickets = relationship("Ticket", back_populates="concert")
