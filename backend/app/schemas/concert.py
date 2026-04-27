from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ConcertBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    artist: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue: str = Field(..., min_length=1, max_length=200)
    date: datetime
    time: str = Field(..., min_length=1, max_length=32)
    price: float = Field(..., gt=0)
    quota: int = Field(..., ge=1, le=100000)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("image_url")
    @classmethod
    def image_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if not value.startswith(("https://", "http://")):
            raise ValueError("image_url harus berupa URL http atau https")
        return value


class ConcertCreate(ConcertBase):
    pass


class ConcertUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    artist: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue: Optional[str] = Field(default=None, min_length=1, max_length=200)
    date: Optional[datetime] = None
    time: Optional[str] = Field(default=None, min_length=1, max_length=32)
    price: Optional[float] = Field(default=None, gt=0)
    quota: Optional[int] = Field(default=None, ge=1, le=100000)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("image_url")
    @classmethod
    def image_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if not value.startswith(("https://", "http://")):
            raise ValueError("image_url harus berupa URL http atau https")
        return value


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
