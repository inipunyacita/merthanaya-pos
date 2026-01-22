"""User models for authentication and user management."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    STAFF = "staff"


class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STAFF


class UserCreate(UserBase):
    """Model for creating a new user (admin only)."""
    password: str


class UserUpdate(BaseModel):
    """Model for updating user details."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class User(UserBase):
    """Full user model with all fields."""
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Response model for user data (excludes sensitive info)."""
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenVerifyResponse(BaseModel):
    """Token verification response."""
    valid: bool
    user: Optional[UserResponse] = None
