from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class OrderItemCreate(BaseModel):
    """Schema for a single item when creating an order."""
    product_id: UUID
    quantity: Decimal = Field(..., gt=0, description="Quantity (units or kg)")

class OrderCreate(BaseModel):
    """Schema for creating a new order from Runner."""
    items: list[OrderItemCreate] = Field(..., min_length=1)
    runner_id: Optional[UUID] = None

class OrderItemResponse(BaseModel):
    """Schema for order item in responses."""
    id: UUID
    product_id: UUID
    product_name: str
    quantity: Decimal
    price_at_purchase: Decimal
    subtotal: Decimal

class OrderResponse(BaseModel):
    """Schema for order responses."""
    id: UUID
    daily_id: int
    short_id: str = Field(..., description="Formatted daily ID like '#001'")
    runner_id: Optional[UUID]
    total_amount: Decimal
    status: str
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderSummary(BaseModel):
    """Brief order summary for cashier queue."""
    id: UUID
    daily_id: int
    short_id: str
    total_amount: Decimal
    status: str
    item_count: int
    created_at: datetime

class PendingOrdersResponse(BaseModel):
    """Schema for pending orders list."""
    orders: list[OrderSummary]
    total: int

class PaymentResponse(BaseModel):
    """Schema for payment confirmation."""
    id: UUID
    short_id: str
    status: str
    paid_at: datetime
