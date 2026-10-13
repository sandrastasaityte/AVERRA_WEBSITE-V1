
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/health.py

API health-check endpoint.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(
    tags=["Health"],
)


@router.get("/health")
def health_check():
    """
    Check whether the AVERRA API is responding.
    """

    return {
        "status": "healthy",
        "application": "AVERRA Staffing Solutions API",
        "company": "AVERRA Staffing Solutions Ltd",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
