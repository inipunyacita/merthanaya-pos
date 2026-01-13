from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from typing import Optional
from decimal import Decimal

from app.db.supabase import get_db
from app.models.product import (
    ProductCreate, 
    ProductUpdate, 
    ProductResponse, 
    ProductListResponse
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    active_only: bool = Query(True, description="Show only active products"),
    search: Optional[str] = Query(None, description="Search by name or barcode")
):
    """List all products with optional filtering."""
    try:
        db = get_db()
        query = db.table("products").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
        
        if category:
            query = query.eq("category", category)
        
        if search:
            query = query.or_(f"name.ilike.%{search}%,barcode.ilike.%{search}%")
        
        query = query.order("name")
        result = query.execute()
        
        products = [ProductResponse(**p) for p in result.data]
        return ProductListResponse(products=products, total=len(products))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID):
    """Get a single product by ID."""
    try:
        db = get_db()
        result = db.table("products").select("*").eq("id", str(product_id)).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return ProductResponse(**result.data)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(barcode: str):
    """Get a product by barcode (for scanner lookup)."""
    try:
        db = get_db()
        result = db.table("products").select("*").eq("barcode", barcode).eq("is_active", True).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Product not found for this barcode")
        
        return ProductResponse(**result.data)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(product: ProductCreate):
    """Create a new product."""
    try:
        db = get_db()
        
        # Check for duplicate barcode if provided
        if product.barcode:
            existing = db.table("products").select("id").eq("barcode", product.barcode).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="Barcode already exists")
        
        # Prepare data for insert
        product_data = product.model_dump()
        product_data["price"] = float(product_data["price"])  # Convert Decimal to float for JSON
        
        result = db.table("products").insert(product_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create product")
        
        return ProductResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: UUID, product: ProductUpdate):
    """Update an existing product."""
    try:
        db = get_db()
        
        # Check if product exists
        existing = db.table("products").select("*").eq("id", str(product_id)).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check for duplicate barcode if changing
        if product.barcode and product.barcode != existing.data.get("barcode"):
            barcode_check = db.table("products").select("id").eq("barcode", product.barcode).execute()
            if barcode_check.data:
                raise HTTPException(status_code=400, detail="Barcode already exists")
        
        # Only update provided fields
        update_data = product.model_dump(exclude_unset=True)
        if "price" in update_data and update_data["price"] is not None:
            update_data["price"] = float(update_data["price"])
        
        if not update_data:
            return ProductResponse(**existing.data)
        
        result = db.table("products").update(update_data).eq("id", str(product_id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update product")
        
        return ProductResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{product_id}")
async def delete_product(product_id: UUID, hard_delete: bool = Query(False)):
    """Soft delete (default) or hard delete a product."""
    try:
        db = get_db()
        
        # Check if product exists
        existing = db.table("products").select("id").eq("id", str(product_id)).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if hard_delete:
            db.table("products").delete().eq("id", str(product_id)).execute()
            return {"message": "Product permanently deleted"}
        else:
            db.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
            return {"message": "Product deactivated"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
