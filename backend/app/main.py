from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time

from app.routers import products_router, orders_router, analytics_router, inventory_router, auth_router, users_router, stores_router


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting for login endpoint."""
    
    def __init__(self, app, requests_per_minute: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only rate limit login endpoint
        if request.url.path == "/auth/login" and request.method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            # Clean old requests (older than 1 minute)
            if client_ip in self.requests:
                self.requests[client_ip] = [
                    t for t in self.requests[client_ip] if now - t < 60
                ]
            else:
                self.requests[client_ip] = []
            
            # Check rate limit
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                return Response(
                    content='{"detail": "Too many login attempts. Please wait 1 minute."}',
                    status_code=429,
                    media_type="application/json"
                )
            
            # Record this request
            self.requests[client_ip].append(now)
        
        return await call_next(request)


app = FastAPI(
    title="Merthanaya POS API",
    description="Backend API for Traditional Market Hybrid POS System",
    version="1.0.0"
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add rate limiting middleware (10 login attempts per minute)
app.add_middleware(RateLimitMiddleware, requests_per_minute=10)

# CORS - Allow frontend origins with specific headers (not wildcard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # Alternative port
        "https://merthanayastaging.cakatech.cloud",
        "https://antigravity.cakatech.cloud",      # Cloudflare Tunnel (frontend)
        "https://api-antigravity.cakatech.cloud",  # Cloudflare Tunnel (backend)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # SECURITY: Only allow specific headers instead of wildcard
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(analytics_router)
app.include_router(inventory_router)
app.include_router(stores_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Merthanaya POS API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
    }
