from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConcertBase(BaseModel):
    name: str
    artist: str
    description: Optional[str] = None
    venue: str
    date: datetime
    time: str
    price: float
    quota: int
    image_url: Optional[str] = None


class ConcertCreate(ConcertBase):
    pass


class ConcertUpdate(BaseModel):
    name: Optional[str] = None
    artist: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    date: Optional[datetime] = None
    time: Optional[str] = None
    price: Optional[float] = None
    quota: Optional[int] = None
    image_url: Optional[str] = None


class ConcertResponse(ConcertBase):
    id: str
    available_tickets: int

    class Config:
        from_attributes = True


class ConcertListResponse(BaseModel):
    items: list[ConcertResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
