from fastapi import APIRouter, Query, HTTPException, Depends
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from app.db.supabase import get_db
from app.models.analytics import (
    SalesSummary,
    SalesSummaryResponse,
    TopProduct,
    TopProductsResponse,
    CategorySales,
    CategorySalesResponse,
    DailySales,
    SalesTrendResponse,
    HourlyDistribution,
    HourlyDistributionResponse,
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_date_range(days: int = 7, date_from: Optional[date] = None, date_to: Optional[date] = None):
    """Helper to calculate date range."""
    if date_from and date_to:
        return date_from, date_to
    
    today = date.today()
    return today - timedelta(days=days - 1), today


@router.get("/summary", response_model=SalesSummaryResponse)
async def get_sales_summary(
    days: int = Query(7, ge=1, le=365, description="Number of days to include"),
    date_from: Optional[date] = Query(None, description="Start date (overrides days)"),
    date_to: Optional[date] = Query(None, description="End date (overrides days)"),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get sales summary for a date range.
    Returns total revenue, order count, average order value, and items sold.
    Staff users only see their own orders, admin sees all.
    """
    try:
        db = get_db()
        start_date, end_date = get_date_range(days, date_from, date_to)
        
        # Query paid orders within date range
        query = db.table("orders").select(
            "id, total_amount, created_at, runner_id"
        ).eq(
            "status", "PAID"
        ).gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte(
            "created_at", f"{end_date}T23:59:59"
        )
        
        # Staff users only see their own orders
        if current_user and current_user.get("role") == "staff":
            query = query.eq("runner_id", current_user["id"])
        
        orders_result = query.execute()
        
        orders = orders_result.data or []
        
        total_revenue = Decimal("0")
        total_orders = len(orders)
        
        for order in orders:
            total_revenue += Decimal(str(order["total_amount"]))
        
        # Count items sold
        order_ids = [order["id"] for order in orders]
        total_items = 0
        
        if order_ids:
            items_result = db.table("order_items").select(
                "quantity"
            ).in_("order_id", order_ids).execute()
            
            for item in items_result.data or []:
                total_items += int(Decimal(str(item["quantity"])))
        
        average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal("0")
        
        return SalesSummaryResponse(
            summary=SalesSummary(
                total_revenue=total_revenue,
                total_orders=total_orders,
                average_order_value=average_order_value.quantize(Decimal("0.01")),
                total_items_sold=total_items,
                date_from=start_date,
                date_to=end_date
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-products", response_model=TopProductsResponse)
async def get_top_products(
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get top selling products by revenue.
    Staff users only see their own orders, admin sees all.
    """
    try:
        db = get_db()
        start_date, end_date = get_date_range(days, date_from, date_to)
        
        # Get paid orders in date range
        query = db.table("orders").select(
            "id"
        ).eq(
            "status", "PAID"
        ).gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte(
            "created_at", f"{end_date}T23:59:59"
        )
        
        # Staff users only see their own orders
        if current_user and current_user.get("role") == "staff":
            query = query.eq("runner_id", current_user["id"])
        
        orders_result = query.execute()
        
        order_ids = [o["id"] for o in orders_result.data or []]
        
        if not order_ids:
            return TopProductsResponse(products=[], date_from=start_date, date_to=end_date)
        
        # Get order items with product info
        items_result = db.table("order_items").select(
            "product_id, quantity, price_at_purchase"
        ).in_("order_id", order_ids).execute()
        
        # Aggregate by product
        product_stats = {}
        for item in items_result.data or []:
            pid = item["product_id"]
            qty = Decimal(str(item["quantity"]))
            price = Decimal(str(item["price_at_purchase"]))
            revenue = qty * price
            
            if pid not in product_stats:
                product_stats[pid] = {"units_sold": Decimal("0"), "revenue": Decimal("0")}
            
            product_stats[pid]["units_sold"] += qty
            product_stats[pid]["revenue"] += revenue
        
        # Sort by revenue and get top N
        sorted_products = sorted(
            product_stats.items(),
            key=lambda x: x[1]["revenue"],
            reverse=True
        )[:limit]
        
        product_ids = [p[0] for p in sorted_products]
        
        if not product_ids:
            return TopProductsResponse(products=[], date_from=start_date, date_to=end_date)
        
        # Get product details
        products_result = db.table("products").select(
            "id, name, category, unit_type"
        ).in_("id", product_ids).execute()
        
        product_info = {p["id"]: p for p in products_result.data or []}
        
        top_products = []
        for pid, stats in sorted_products:
            if pid in product_info:
                info = product_info[pid]
                top_products.append(TopProduct(
                    product_id=pid,
                    product_name=info["name"],
                    category=info["category"],
                    units_sold=stats["units_sold"],
                    revenue=stats["revenue"],
                    unit_type=info.get("unit_type", "item")
                ))
        
        return TopProductsResponse(
            products=top_products,
            date_from=start_date,
            date_to=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales-by-category", response_model=CategorySalesResponse)
async def get_sales_by_category(
    days: int = Query(7, ge=1, le=365),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get sales breakdown by product category.
    Staff users only see their own orders, admin sees all.
    """
    try:
        db = get_db()
        start_date, end_date = get_date_range(days, date_from, date_to)
        
        # Get paid orders
        query = db.table("orders").select(
            "id"
        ).eq(
            "status", "PAID"
        ).gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte(
            "created_at", f"{end_date}T23:59:59"
        )
        
        # Staff users only see their own orders
        if current_user and current_user.get("role") == "staff":
            query = query.eq("runner_id", current_user["id"])
        
        orders_result = query.execute()
        
        order_ids = [o["id"] for o in orders_result.data or []]
        
        if not order_ids:
            return CategorySalesResponse(categories=[], date_from=start_date, date_to=end_date)
        
        # Get items with product info
        items_result = db.table("order_items").select(
            "product_id, quantity, price_at_purchase, order_id"
        ).in_("order_id", order_ids).execute()
        
        # Get all product categories
        product_ids = list(set(i["product_id"] for i in items_result.data or []))
        
        if not product_ids:
            return CategorySalesResponse(categories=[], date_from=start_date, date_to=end_date)
        
        products_result = db.table("products").select(
            "id, category"
        ).in_("id", product_ids).execute()
        
        product_categories = {p["id"]: p["category"] for p in products_result.data or []}
        
        # Aggregate by category
        category_stats = {}
        orders_by_category = {}
        
        for item in items_result.data or []:
            category = product_categories.get(item["product_id"], "Other")
            revenue = Decimal(str(item["quantity"])) * Decimal(str(item["price_at_purchase"]))
            
            if category not in category_stats:
                category_stats[category] = Decimal("0")
                orders_by_category[category] = set()
            
            category_stats[category] += revenue
            orders_by_category[category].add(item["order_id"])
        
        total_revenue = sum(category_stats.values())
        
        categories = []
        for cat, revenue in sorted(category_stats.items(), key=lambda x: x[1], reverse=True):
            percentage = float(revenue / total_revenue * 100) if total_revenue > 0 else 0
            categories.append(CategorySales(
                category=cat,
                revenue=revenue,
                order_count=len(orders_by_category[cat]),
                percentage=round(percentage, 1)
            ))
        
        return CategorySalesResponse(
            categories=categories,
            date_from=start_date,
            date_to=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales-trend", response_model=SalesTrendResponse)
async def get_sales_trend(
    days: int = Query(7, ge=1, le=90),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get daily sales data for trend charts.
    Staff users only see their own orders, admin sees all.
    """
    try:
        db = get_db()
        start_date, end_date = get_date_range(days, date_from, date_to)
        
        # Get paid orders
        query = db.table("orders").select(
            "total_amount, created_at"
        ).eq(
            "status", "PAID"
        ).gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte(
            "created_at", f"{end_date}T23:59:59"
        )
        
        # Staff users only see their own orders
        if current_user and current_user.get("role") == "staff":
            query = query.eq("runner_id", current_user["id"])
        
        orders_result = query.execute()
        
        # Group by date
        daily_data = {}
        current = start_date
        while current <= end_date:
            daily_data[current] = {"revenue": Decimal("0"), "order_count": 0}
            current += timedelta(days=1)
        
        for order in orders_result.data or []:
            try:
                created_at = order["created_at"]
                if created_at:
                    order_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
                    if order_date in daily_data:
                        daily_data[order_date]["revenue"] += Decimal(str(order["total_amount"]))
                        daily_data[order_date]["order_count"] += 1
            except (ValueError, KeyError):
                continue
        
        data = [
            DailySales(
                date=d,
                revenue=stats["revenue"],
                order_count=stats["order_count"]
            )
            for d, stats in sorted(daily_data.items())
        ]
        
        return SalesTrendResponse(
            data=data,
            date_from=start_date,
            date_to=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hourly-distribution", response_model=HourlyDistributionResponse)
async def get_hourly_distribution(
    days: int = Query(7, ge=1, le=365),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get order distribution by hour of day.
    Staff users only see their own orders, admin sees all.
    """
    try:
        db = get_db()
        start_date, end_date = get_date_range(days, date_from, date_to)
        
        # Get paid orders
        query = db.table("orders").select(
            "total_amount, created_at"
        ).eq(
            "status", "PAID"
        ).gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte(
            "created_at", f"{end_date}T23:59:59"
        )
        
        # Staff users only see their own orders
        if current_user and current_user.get("role") == "staff":
            query = query.eq("runner_id", current_user["id"])
        
        orders_result = query.execute()
        
        # Initialize all hours
        hourly_data = {h: {"order_count": 0, "revenue": Decimal("0")} for h in range(24)}
        
        for order in orders_result.data or []:
            try:
                created_at = order.get("created_at")
                if created_at:
                    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    hour = created.hour
                    hourly_data[hour]["order_count"] += 1
                    hourly_data[hour]["revenue"] += Decimal(str(order["total_amount"]))
            except (ValueError, KeyError):
                continue
        
        data = [
            HourlyDistribution(
                hour=h,
                order_count=stats["order_count"],
                revenue=stats["revenue"]
            )
            for h, stats in sorted(hourly_data.items())
        ]
        
        return HourlyDistributionResponse(
            data=data,
            date_from=start_date,
            date_to=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
