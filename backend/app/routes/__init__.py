
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/__init__.py

Central registration for API route modules.
All application API routes are mounted under /api.
"""

from fastapi import APIRouter

from .enquiries import router as enquiries_router
from .health import router as health_router
from .jobs import router as jobs_router


# Central API router.
# Resource-specific prefixes belong in the individual route modules.
api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(jobs_router)
api_router.include_router(enquiries_router)


__all__ = ["api_router"]
