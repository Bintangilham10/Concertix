import re

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

CONTROL_OR_TAG_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f<>]")
MAX_CONCERT_PRICE = 1_000_000_000


class ConcertBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    artist: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue: str = Field(..., min_length=1, max_length=200)
    date: datetime
    time: str = Field(..., min_length=1, max_length=32)
    price: float = Field(..., gt=0, le=MAX_CONCERT_PRICE)
    quota: int = Field(..., ge=1, le=100000)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "artist", "venue", "time")
    @classmethod
    def text_fields_must_be_plain_text(cls, value: str) -> str:
        normalized = value.strip()
        if CONTROL_OR_TAG_CHARS.search(normalized):
            raise ValueError("Input teks tidak boleh memuat karakter kontrol atau tag HTML")
        return normalized

    @field_validator("description")
    @classmethod
    def description_must_be_plain_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None
        if CONTROL_OR_TAG_CHARS.search(normalized):
            raise ValueError("Deskripsi tidak boleh memuat karakter kontrol atau tag HTML")
        return normalized

    @field_validator("image_url")
    @classmethod
    def image_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None
        if not normalized.startswith(("https://", "http://")):
            raise ValueError("image_url harus berupa URL http atau https")
        return normalized


class ConcertCreate(ConcertBase):
    pass


class ConcertUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    artist: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue: Optional[str] = Field(default=None, min_length=1, max_length=200)
    date: Optional[datetime] = None
    time: Optional[str] = Field(default=None, min_length=1, max_length=32)
    price: Optional[float] = Field(default=None, gt=0, le=MAX_CONCERT_PRICE)
    quota: Optional[int] = Field(default=None, ge=1, le=100000)
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "artist", "venue", "time")
    @classmethod
    def text_fields_must_be_plain_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return ConcertBase.text_fields_must_be_plain_text(value)

    @field_validator("description")
    @classmethod
    def description_must_be_plain_text(cls, value: Optional[str]) -> Optional[str]:
        return ConcertBase.description_must_be_plain_text(value)

    @field_validator("image_url")
    @classmethod
    def image_url_must_be_http(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None
        if not normalized.startswith(("https://", "http://")):
            raise ValueError("image_url harus berupa URL http atau https")
        return normalized


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
