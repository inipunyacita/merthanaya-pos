from fastapi import APIRouter, HTTPException
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

from app.db.supabase import get_db
from app.models.order import (
    OrderCreate,
    OrderResponse,
    OrderItemResponse,
    OrderSummary,
    PendingOrdersResponse,
    PaginatedOrdersResponse,
    PaymentResponse
)

router = APIRouter(prefix="/orders", tags=["orders"])


def get_or_create_daily_counter(db) -> int:
    """Get the next daily ID number, creating today's counter if needed."""
    today = date.today().isoformat()
    
    # Try to get today's counter
    result = db.table("daily_counters").select("*").eq("date", today).execute()
    
    if result.data:
        # Increment and return
        new_number = result.data[0]["last_number"] + 1
        db.table("daily_counters").update({"last_number": new_number}).eq("date", today).execute()
        return new_number
    else:
        # Create new counter for today starting at 1
        db.table("daily_counters").insert({"date": today, "last_number": 1}).execute()
        return 1


def format_daily_id(number: int) -> str:
    """Format daily ID as #001, #002, etc."""
    return f"#{number:03d}"


def generate_invoice_id(daily_id: int) -> str:
    """Generate invoice ID in format INV-YYYYMMDD-XXX."""
    today = date.today().strftime("%Y%m%d")
    return f"INV-{today}-{daily_id:03d}"


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(order: OrderCreate):
    """
    Create a new order from the Runner.
    - Generates daily ID (#001, #002, etc.)
    - Calculates total from current product prices
    - Creates order and order_items records
    """
    try:
        db = get_db()
        
        # Fetch all products in one query
        product_ids = [str(item.product_id) for item in order.items]
        products_result = db.table("products").select("*").in_("id", product_ids).execute()
        
        if not products_result.data:
            raise HTTPException(status_code=400, detail="No valid products found")
        
        # Create product lookup dict
        products_map = {p["id"]: p for p in products_result.data}
        
        # Validate all products exist and are active
        for item in order.items:
            product = products_map.get(str(item.product_id))
            if not product:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Product {item.product_id} not found"
                )
            if not product.get("is_active", True):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Product '{product['name']}' is not available"
                )
        
        # Get next daily ID and generate invoice ID
        daily_id = get_or_create_daily_counter(db)
        short_id = format_daily_id(daily_id)
        invoice_id = generate_invoice_id(daily_id)
        
        # Calculate items with subtotals
        order_items_data = []
        total_amount = Decimal("0")
        
        for item in order.items:
            product = products_map[str(item.product_id)]
            price = Decimal(str(product["price"]))
            subtotal = price * item.quantity
            total_amount += subtotal
            
            order_items_data.append({
                "product_id": str(item.product_id),
                "product_name": product["name"],
                "quantity": float(item.quantity),
                "price_at_purchase": float(price),
                "subtotal": float(subtotal)
            })
        
        # Create order
        order_data = {
            "daily_id": daily_id,
            "invoice_id": invoice_id,
            "runner_id": str(order.runner_id) if order.runner_id else None,
            "total_amount": float(total_amount),
            "status": "PENDING"
        }
        
        order_result = db.table("orders").insert(order_data).execute()
        
        if not order_result.data:
            raise HTTPException(status_code=500, detail="Failed to create order")
        
        order_record = order_result.data[0]
        order_id = order_record["id"]
        
        # Add order_id to each item and insert
        for item_data in order_items_data:
            item_data["order_id"] = order_id
        
        items_result = db.table("order_items").insert(order_items_data).execute()
        
        if not items_result.data:
            # Rollback order if items fail
            db.table("orders").delete().eq("id", order_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create order items")
        
        # Build response
        response_items = [OrderItemResponse(**item) for item in items_result.data]
        
        return OrderResponse(
            id=order_record["id"],
            daily_id=daily_id,
            short_id=short_id,
            invoice_id=invoice_id,
            runner_id=order.runner_id,
            total_amount=Decimal(str(order_record["total_amount"])),
            status=order_record["status"],
            items=response_items,
            created_at=order_record["created_at"],
            updated_at=order_record["updated_at"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=PendingOrdersResponse)
async def get_pending_orders():
    """Get all pending orders for the Cashier dashboard."""
    try:
        db = get_db()
        
        # Get pending orders ordered by creation time
        result = db.table("orders")\
            .select("*")\
            .eq("status", "PENDING")\
            .order("created_at", desc=False)\
            .execute()
        
        orders = []
        for order_data in result.data:
            # Get item count for each order
            items_result = db.table("order_items")\
                .select("id", count="exact")\
                .eq("order_id", order_data["id"])\
                .execute()
            
            item_count = items_result.count if items_result.count else 0
            
            orders.append(OrderSummary(
                id=order_data["id"],
                daily_id=order_data["daily_id"],
                short_id=format_daily_id(order_data["daily_id"]),
                invoice_id=order_data.get("invoice_id") or generate_invoice_id(order_data["daily_id"]),
                total_amount=Decimal(str(order_data["total_amount"])),
                status=order_data["status"],
                item_count=item_count,
                created_at=order_data["created_at"]
            ))
        
        return PendingOrdersResponse(orders=orders, total=len(orders))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/paid", response_model=PaginatedOrdersResponse)
async def get_paid_orders(page: int = 1, page_size: int = 6):
    """Get all paid orders with pagination for Cashier success history."""
    try:
        db = get_db()
        
        # Get total count first
        count_result = db.table("orders")\
            .select("id", count="exact")\
            .eq("status", "PAID")\
            .execute()
        
        total = count_result.count if count_result.count else 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get paid orders ordered by updated_at (most recent first)
        result = db.table("orders")\
            .select("*")\
            .eq("status", "PAID")\
            .order("updated_at", desc=True)\
            .range(offset, offset + page_size - 1)\
            .execute()
        
        orders = []
        for order_data in result.data:
            # Get item count for each order
            items_result = db.table("order_items")\
                .select("id", count="exact")\
                .eq("order_id", order_data["id"])\
                .execute()
            
            item_count = items_result.count if items_result.count else 0
            
            orders.append(OrderSummary(
                id=order_data["id"],
                daily_id=order_data["daily_id"],
                short_id=format_daily_id(order_data["daily_id"]),
                invoice_id=order_data.get("invoice_id") or generate_invoice_id(order_data["daily_id"]),
                total_amount=Decimal(str(order_data["total_amount"])),
                status=order_data["status"],
                item_count=item_count,
                created_at=order_data["created_at"]
            ))
        
        return PaginatedOrdersResponse(
            orders=orders,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: UUID):
    """Get a single order with all items."""
    try:
        db = get_db()
        
        # Get order
        order_result = db.table("orders").select("*").eq("id", str(order_id)).single().execute()
        
        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_data = order_result.data
        
        # Get items
        items_result = db.table("order_items").select("*").eq("order_id", str(order_id)).execute()
        items = [OrderItemResponse(**item) for item in items_result.data]
        
        return OrderResponse(
            id=order_data["id"],
            daily_id=order_data["daily_id"],
            short_id=format_daily_id(order_data["daily_id"]),
            invoice_id=order_data.get("invoice_id") or generate_invoice_id(order_data["daily_id"]),
            runner_id=order_data.get("runner_id"),
            total_amount=Decimal(str(order_data["total_amount"])),
            status=order_data["status"],
            items=items,
            created_at=order_data["created_at"],
            updated_at=order_data["updated_at"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/pay", response_model=PaymentResponse)
async def mark_order_paid(order_id: UUID):
    """Mark an order as paid (Cashier action)."""
    try:
        db = get_db()
        
        # Get current order
        order_result = db.table("orders").select("*").eq("id", str(order_id)).single().execute()
        
        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order_result.data["status"] != "PENDING":
            raise HTTPException(
                status_code=400, 
                detail=f"Order is already {order_result.data['status']}"
            )
        
        # Update status
        now = datetime.utcnow().isoformat()
        result = db.table("orders")\
            .update({"status": "PAID", "updated_at": now})\
            .eq("id", str(order_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update order")
        
        return PaymentResponse(
            id=order_result.data["id"],
            short_id=format_daily_id(order_result.data["daily_id"]),
            invoice_id=order_result.data.get("invoice_id") or generate_invoice_id(order_result.data["daily_id"]),
            status="PAID",
            paid_at=now
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/cancel")
async def cancel_order(order_id: UUID):
    """Cancel a pending order."""
    try:
        db = get_db()
        
        # Get current order
        order_result = db.table("orders").select("*").eq("id", str(order_id)).single().execute()
        
        if not order_result.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order_result.data["status"] != "PENDING":
            raise HTTPException(
                status_code=400, 
                detail=f"Only pending orders can be cancelled"
            )
        
        # Update status
        now = datetime.utcnow().isoformat()
        db.table("orders")\
            .update({"status": "CANCELLED", "updated_at": now})\
            .eq("id", str(order_id))\
            .execute()
        
        return {"message": "Order cancelled", "short_id": format_daily_id(order_result.data["daily_id"])}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/all", response_model=PaginatedOrdersResponse)
async def get_transaction_history(
    page: int = 1, 
    page_size: int = 20,
    status: str = None,
    date_from: date = None,
    date_to: date = None,
    search: str = None
):
    """
    Get comprehensive transaction history with filters.
    - status: PAID, CANCELLED, or PENDING
    - date_from/date_to: Date range filter
    - search: Search by invoice_id
    """
    try:
        db = get_db()
        
        # Build query
        query = db.table("orders").select("*", count="exact")
        
        # Apply filters
        if status:
            query = query.eq("status", status.upper())
        
        if date_from:
            query = query.gte("created_at", f"{date_from}T00:00:00")
        
        if date_to:
            query = query.lte("created_at", f"{date_to}T23:59:59")
        
        if search:
            query = query.ilike("invoice_id", f"%{search}%")
        
        # Get total count
        count_result = query.execute()
        total = count_result.count if count_result.count else 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        
        # Calculate offset and get paginated results
        offset = (page - 1) * page_size
        
        # Rebuild query with pagination
        query = db.table("orders").select("*")
        
        if status:
            query = query.eq("status", status.upper())
        if date_from:
            query = query.gte("created_at", f"{date_from}T00:00:00")
        if date_to:
            query = query.lte("created_at", f"{date_to}T23:59:59")
        if search:
            query = query.ilike("invoice_id", f"%{search}%")
        
        result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
        
        orders = []
        for order_data in result.data or []:
            # Get item count
            items_result = db.table("order_items")\
                .select("id", count="exact")\
                .eq("order_id", order_data["id"])\
                .execute()
            
            item_count = items_result.count if items_result.count else 0
            
            orders.append(OrderSummary(
                id=order_data["id"],
                daily_id=order_data["daily_id"],
                short_id=format_daily_id(order_data["daily_id"]),
                invoice_id=order_data.get("invoice_id") or generate_invoice_id(order_data["daily_id"]),
                total_amount=Decimal(str(order_data["total_amount"])),
                status=order_data["status"],
                item_count=item_count,
                created_at=order_data["created_at"]
            ))
        
        return PaginatedOrdersResponse(
            orders=orders,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

