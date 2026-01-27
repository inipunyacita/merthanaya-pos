from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime

from app.db.supabase import get_db
from app.models.store import StoreResponse, StoreUpdate
from app.routers.auth import require_auth

router = APIRouter(prefix="/stores", tags=["stores"])

@router.get("/me", response_model=StoreResponse)
async def get_my_store(current_user: dict = Depends(require_auth)):
    """Get the store owned by the current user."""
    db = get_db()
    
    try:
        print(f"[StoreRouter] Fetching store for user ID: {current_user['id']}")
        result = db.table("stores").select("*").eq("owner_id", current_user["id"]).execute()
        
        if not result.data:
            print(f"[StoreRouter] No store found for user {current_user['id']}, creating default...")
            # If no store exists, create a default one for this user
            default_store = {
                "name": f"{current_user.get('full_name', 'My')}'s Store",
                "owner_id": current_user["id"],
                "address": "",
                "phone": "",
                "receipt_footer": "Thank you for shopping!"
            }
            create_result = db.table("stores").insert(default_store).execute()
            if not create_result.data:
                print(f"[StoreRouter] Failed to create store: {create_result}")
                raise HTTPException(status_code=500, detail="Failed to create initial store settings")
            return create_result.data[0]
            
        return result.data[0]
    except Exception as e:
        print(f"[StoreRouter] Error in get_my_store: {str(e)}")
        # Check if error is due to missing table
        if "relation \"stores\" does not exist" in str(e).lower():
            raise HTTPException(
                status_code=500, 
                detail="Database table 'stores' is missing. Please run the SQL migration script in Supabase."
            )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/me", response_model=StoreResponse)
async def update_my_store(
    store_update: StoreUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update the store settings for the current user."""
    db = get_db()
    
    try:
        print(f"[StoreRouter] Updating store for user ID: {current_user['id']}")
        # Check if store exists
        check = db.table("stores").select("id").eq("owner_id", current_user["id"]).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Store settings not found")
        
        update_data = store_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = db.table("stores").update(update_data).eq("owner_id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update store settings")
            
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"[StoreRouter] Error in update_my_store: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
