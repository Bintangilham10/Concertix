import uuid
from sqlalchemy import Column, Integer, String, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum("customer", "admin", name="user_role"), default="customer", nullable=False)
    token_version = Column(Integer, nullable=False, default=0)

    # Relationships
    tickets = relationship("Ticket", back_populates="user")
