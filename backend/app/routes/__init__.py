
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/__init__.py

Central registration for API route modules.
"""

from fastapi import APIRouter

from .health import router as health_router
from .jobs import router as jobs_router
from .enquiries import router as enquiries_router


# Central API router
# The /api prefix is added here, so individual route modules
# should define their own resource prefixes only.
api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(jobs_router)
api_router.include_router(enquiries_router)


__all__ = ["api_router"]
