
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/health.py

API health-check endpoint.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter


router = APIRouter(
    tags=["Health"],
)


@router.get(
    "/health",
    response_model=dict[str, Any],
)
def health_check() -> dict[str, Any]:
    """Check whether the AVERRA API is responding."""

    return {
        "status": "healthy",
        "application": "AVERRA Staffing Solutions API",
        "company": "AVERRA Staffing Solutions Ltd",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
