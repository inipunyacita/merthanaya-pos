from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import products_router, orders_router

app = FastAPI(
    title="Merthanaya POS API",
    description="Backend API for Traditional Market Hybrid POS System",
    version="1.0.0"
)

# CORS - Allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products_router)
app.include_router(orders_router)


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
