from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class ProductBase(BaseModel):
    """Base product schema with common fields."""
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., description="Category: 'Sembako', 'Daging', 'Canang', etc.")
    price: Decimal = Field(..., ge=0, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    barcode: Optional[str] = Field(None, description="Barcode for 'Sembako' items, NULL for visual items")
    image_url: Optional[str] = Field(None, description="Image URL for visual products")
    unit_type: str = Field(default="item", description="'item' or 'weight' (kg)")
    is_active: bool = Field(default=True)

class ProductCreate(ProductBase):
    """Schema for creating a new product."""
    pass

class ProductUpdate(BaseModel):
    """Schema for updating a product. All fields optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    unit_type: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    """Schema for product responses including database fields."""
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    """Schema for paginated product list response."""
    products: list[ProductResponse]
    total: int
