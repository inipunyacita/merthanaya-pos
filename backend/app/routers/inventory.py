from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from decimal import Decimal
from typing import Optional
from datetime import datetime

from app.db.supabase import get_db
from app.models.analytics import (
    LowStockProduct,
    LowStockResponse,
    StockAdjustment,
    StockHistoryEntry,
    StockHistoryResponse,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/low-stock", response_model=LowStockResponse)
async def get_low_stock_products(
    threshold: int = Query(10, ge=0, description="Stock threshold to consider as low")
):
    """
    Get products with stock below the specified threshold.
    """
    try:
        db = get_db()
        
        result = db.table("products").select(
            "id, name, category, stock, unit_type"
        ).eq(
            "is_active", True
        ).lte(
            "stock", threshold
        ).order("stock", desc=False).execute()
        
        products = [
            LowStockProduct(
                id=p["id"],
                name=p["name"],
                category=p["category"],
                stock=Decimal(str(p["stock"])),
                unit_type=p.get("unit_type") or "item",
                threshold=Decimal(str(threshold))
            )
            for p in result.data or []
        ]
        
        return LowStockResponse(products=products, threshold=Decimal(str(threshold)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjust")
async def adjust_stock(adjustment: StockAdjustment):
    """
    Manually adjust product stock.
    Positive adjustment adds stock, negative subtracts.
    """
    db = get_db()
    
    # Get current product stock
    product_result = db.table("products").select(
        "id, stock, name"
    ).eq("id", str(adjustment.product_id)).single().execute()
    
    if not product_result.data:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = product_result.data
    current_stock = Decimal(str(product["stock"]))
    new_stock = current_stock + adjustment.adjustment
    
    if new_stock < 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot reduce stock below 0. Current: {current_stock}, Adjustment: {adjustment.adjustment}"
        )
    
    # Update product stock
    db.table("products").update({
        "stock": float(new_stock)
    }).eq("id", str(adjustment.product_id)).execute()
    
    # Log to stock_history table (if exists)
    try:
        db.table("stock_history").insert({
            "product_id": str(adjustment.product_id),
            "previous_stock": float(current_stock),
            "new_stock": float(new_stock),
            "adjustment": float(adjustment.adjustment),
            "reason": adjustment.reason,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception:
        # Table may not exist yet, that's okay
        pass
    
    return {
        "success": True,
        "product_id": str(adjustment.product_id),
        "product_name": product["name"],
        "previous_stock": current_stock,
        "new_stock": new_stock,
        "adjustment": adjustment.adjustment
    }


@router.get("/history/{product_id}", response_model=StockHistoryResponse)
async def get_stock_history(
    product_id: UUID,
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get stock adjustment history for a product.
    """
    db = get_db()
    
    try:
        result = db.table("stock_history").select(
            "id, product_id, previous_stock, new_stock, adjustment, reason, created_at"
        ).eq(
            "product_id", str(product_id)
        ).order(
            "created_at", desc=True
        ).limit(limit).execute()
        
        entries = [
            StockHistoryEntry(
                id=e["id"],
                product_id=e["product_id"],
                previous_stock=Decimal(str(e["previous_stock"])),
                new_stock=Decimal(str(e["new_stock"])),
                adjustment=Decimal(str(e["adjustment"])),
                reason=e.get("reason"),
                created_at=e["created_at"]
            )
            for e in result.data or []
        ]
        
        return StockHistoryResponse(entries=entries, product_id=product_id)
    
    except Exception:
        # Table may not exist
        return StockHistoryResponse(entries=[], product_id=product_id)
