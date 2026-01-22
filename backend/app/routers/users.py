"""User management router (admin only)."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from supabase import Client

from app.routers.auth import get_supabase_admin_client, require_admin
from app.models.user import (
    User, UserCreate, UserUpdate, UserResponse, UserRole
)

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """List all users (admin only)."""
    query = supabase.table("users").select("*")
    
    if role:
        query = query.eq("role", role)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    response = query.range(skip, skip + limit - 1).order("created_at", desc=True).execute()
    
    return [
        UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=UserRole(user["role"]),
            is_active=user["is_active"],
            created_at=user["created_at"],
        )
        for user in response.data
    ]


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Create a new user (admin only)."""
    try:
        # Create auth user in Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True  # Auto-confirm email
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        # Create profile in users table
        profile_data = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role.value,
            "is_active": True,
        }
        
        profile_response = supabase.table("users").insert(profile_data).execute()
        
        if not profile_response.data:
            # Rollback: delete auth user if profile creation fails
            supabase.auth.admin.delete_user(auth_response.user.id)
            raise HTTPException(status_code=400, detail="Failed to create user profile")
        
        profile = profile_response.data[0]
        
        return UserResponse(
            id=profile["id"],
            email=profile["email"],
            full_name=profile["full_name"],
            role=UserRole(profile["role"]),
            is_active=profile["is_active"],
            created_at=profile["created_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Get a specific user by ID (admin only)."""
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = response.data
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        created_at=user["created_at"],
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Update a user (admin only)."""
    # Build update data
    update_data = {}
    if user_data.email is not None:
        update_data["email"] = user_data.email
    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name
    if user_data.role is not None:
        update_data["role"] = user_data.role.value
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update email in Supabase Auth if changed
    if user_data.email is not None:
        try:
            supabase.auth.admin.update_user_by_id(user_id, {"email": user_data.email})
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to update email: {str(e)}")
    
    # Update profile
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = response.data[0]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        created_at=user["created_at"],
    )


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    hard_delete: bool = Query(False, description="Permanently delete user"),
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Deactivate or delete a user (admin only)."""
    # Prevent admin from deleting themselves
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    if hard_delete:
        # Delete from users table
        supabase.table("users").delete().eq("id", user_id).execute()
        # Delete from Supabase Auth
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass  # User might not exist in auth
        return {"message": "User permanently deleted"}
    else:
        # Soft delete: deactivate
        response = supabase.table("users").update({"is_active": False}).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deactivated"}


@router.post("/{user_id}/reactivate", response_model=UserResponse)
async def reactivate_user(
    user_id: str,
    admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Reactivate a deactivated user (admin only)."""
    response = supabase.table("users").update({"is_active": True}).eq("id", user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = response.data[0]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        created_at=user["created_at"],
    )
