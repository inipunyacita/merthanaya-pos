from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
from uuid import UUID


class SalesSummary(BaseModel):
    """Sales summary for a date range."""
    total_revenue: Decimal
    total_orders: int
    average_order_value: Decimal
    total_items_sold: int
    date_from: date
    date_to: date


class TopProduct(BaseModel):
    """Top selling product data."""
    product_id: UUID
    product_name: str
    category: str
    units_sold: Decimal
    revenue: Decimal
    unit_type: str = "item"


class CategorySales(BaseModel):
    """Sales data by category."""
    category: str
    revenue: Decimal
    order_count: int
    percentage: float


class DailySales(BaseModel):
    """Daily sales data point for trend charts."""
    date: date
    revenue: Decimal
    order_count: int


class HourlyDistribution(BaseModel):
    """Hourly order distribution."""
    hour: int  # 0-23
    order_count: int
    revenue: Decimal


class SalesSummaryResponse(BaseModel):
    """Response schema for sales summary endpoint."""
    summary: SalesSummary


class TopProductsResponse(BaseModel):
    """Response schema for top products endpoint."""
    products: list[TopProduct]
    date_from: date
    date_to: date


class CategorySalesResponse(BaseModel):
    """Response schema for category sales endpoint."""
    categories: list[CategorySales]
    date_from: date
    date_to: date


class SalesTrendResponse(BaseModel):
    """Response schema for sales trend endpoint."""
    data: list[DailySales]
    date_from: date
    date_to: date


class HourlyDistributionResponse(BaseModel):
    """Response schema for hourly distribution endpoint."""
    data: list[HourlyDistribution]
    date_from: date
    date_to: date


class LowStockProduct(BaseModel):
    """Product with low stock."""
    id: UUID
    name: str
    category: str
    stock: Decimal
    unit_type: str
    threshold: Decimal


class LowStockResponse(BaseModel):
    """Response schema for low stock endpoint."""
    products: list[LowStockProduct]
    threshold: Decimal


class StockAdjustment(BaseModel):
    """Schema for stock adjustment request."""
    product_id: UUID
    adjustment: Decimal  # Positive = add, Negative = subtract
    reason: Optional[str] = None


class StockHistoryEntry(BaseModel):
    """Stock history entry."""
    id: UUID
    product_id: UUID
    previous_stock: Decimal
    new_stock: Decimal
    adjustment: Decimal
    reason: Optional[str]
    created_at: str


class StockHistoryResponse(BaseModel):
    """Response schema for stock history endpoint."""
    entries: list[StockHistoryEntry]
    product_id: UUID
