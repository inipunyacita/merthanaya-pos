"""Authentication router for Supabase Auth integration."""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from supabase import create_client, Client

from app.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
from app.models.user import (
    LoginRequest, LoginResponse, UserResponse, TokenVerifyResponse, UserRole
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_supabase_client() -> Client:
    """Get Supabase client with anon key."""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """Get Supabase client with service role key (admin operations)."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Get current authenticated user from JWT token."""
    if not authorization:
        return None
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        
        # Use anon client with the user's token to verify
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            return None
        
        # Use admin client to query users table (bypasses RLS)
        admin_client = get_supabase_admin_client()
        try:
            profile = admin_client.table("users").select("*").eq("id", user_response.user.id).single().execute()
            if profile.data:
                return {
                    "id": user_response.user.id,
                    "email": user_response.user.email,
                    "full_name": profile.data.get("full_name", ""),
                    "role": profile.data.get("role", "staff"),
                    "is_active": profile.data.get("is_active", True),
                    "created_at": profile.data.get("created_at"),
                }
        except Exception:
            pass  # Continue to fallback
        
        # Fallback: user exists in auth but no profile - use default admin for now
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "full_name": user_response.user.email.split("@")[0] if user_response.user.email else "User",
            "role": "admin",  # Default to admin for authenticated users without profile
            "is_active": True,
            "created_at": None,
        }
    except Exception as e:
        print(f"[get_current_user] Error: {e}")
        return None


async def require_auth(
    authorization: Optional[str] = Header(None),
) -> dict:
    """Require authentication - raises 401 if not authenticated."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is deactivated")
    return user


async def require_admin(
    user: dict = Depends(require_auth)
) -> dict:
    """Require admin role - raises 403 if not admin."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, supabase: Client = Depends(get_supabase_client)):
    """Login with email and password."""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get user profile
        profile = supabase.table("users").select("*").eq("id", auth_response.user.id).single().execute()
        
        if not profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        if not profile.data.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is deactivated")
        
        user_response = UserResponse(
            id=auth_response.user.id,
            email=auth_response.user.email,
            full_name=profile.data.get("full_name", ""),
            role=UserRole(profile.data.get("role", "staff")),
            is_active=profile.data.get("is_active", True),
            created_at=profile.data.get("created_at"),
        )
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase_client)
):
    """Logout current user."""
    if authorization:
        try:
            token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
            supabase.auth.sign_out()
        except Exception:
            pass  # Ignore errors during logout
    return {"message": "Logged out successfully"}


@router.post("/verify-token", response_model=TokenVerifyResponse)
async def verify_token(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase_client)
):
    """Verify if the current token is valid."""
    user = await get_current_user(authorization, supabase)
    if user:
        return TokenVerifyResponse(
            valid=True,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                role=UserRole(user["role"]),
                is_active=user["is_active"],
                created_at=user["created_at"],
            )
        )
    return TokenVerifyResponse(valid=False)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    """Get current authenticated user profile."""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        created_at=user["created_at"],
    )


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Send password reset email."""
    try:
        supabase.auth.reset_password_for_email(email)
        return {"message": "If an account with this email exists, a password reset link has been sent."}
    except Exception:
        # Return same message to prevent email enumeration
        return {"message": "If an account with this email exists, a password reset link has been sent."}


@router.post("/refresh-token")
async def refresh_token(
    refresh_token: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Refresh access token."""
    try:
        response = supabase.auth.refresh_session(refresh_token)
        if response.session:
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "token_type": "bearer"
            }
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
