import re

from pydantic import BaseModel, EmailStr, Field, field_validator


CONTROL_OR_TAG_CHARS = re.compile(r"[\x00-\x1f\x7f<>]")


class UserBase(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    full_name: str = Field(..., min_length=2, max_length=120)

    @field_validator("full_name")
    @classmethod
    def full_name_must_be_plain_text(cls, value: str) -> str:
        normalized = value.strip()
        if CONTROL_OR_TAG_CHARS.search(normalized):
            raise ValueError("Nama lengkap tidak boleh memuat karakter kontrol atau tag HTML")
        return normalized


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        has_upper = any(char.isupper() for char in value)
        has_lower = any(char.islower() for char in value)
        has_digit = any(char.isdigit() for char in value)
        if not (has_upper and has_lower and has_digit):
            raise ValueError("Password harus mengandung huruf besar, huruf kecil, dan angka")
        return value


class UserLogin(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(UserBase):
    id: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., max_length=254)


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    otp: str = Field(..., pattern=r"^\d{6}$")
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        return UserCreate.password_must_be_strong(value)
