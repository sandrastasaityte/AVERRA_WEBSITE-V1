
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/health.py
Version: 2.0.0

API health-check endpoints.
Provides basic liveness and database readiness checks.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.connection import get_db


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


def utc_timestamp() -> str:
    """Return the current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


@router.get(
    "/health",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
)
def health_check() -> dict[str, Any]:
    """
    Liveness check.

    Confirms that the API process is responding.
    Does not check database connectivity.
    """
    return {
        "status": "healthy",
        "application": "AVERRA Staffing Solutions API",
        "company": "AVERRA Staffing Solutions Ltd",
        "timestamp": utc_timestamp(),
    }


@router.get(
    "/health/ready",
    response_model=dict[str, Any],
)
def readiness_check(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Readiness check.

    Tests whether the application can execute a simple database query.
    Does not expose database credentials or connection details.
    """
    try:
        db.execute(text("SELECT 1"))

    except SQLAlchemyError:
        logger.exception(
            "AVERRA readiness check failed: database unavailable."
        )

        return {
            "status": "unavailable",
            "application": "AVERRA Staffing Solutions API",
            "company": "AVERRA Staffing Solutions Ltd",
            "database": "unavailable",
            "timestamp": utc_timestamp(),
        }

    return {
        "status": "ready",
        "application": "AVERRA Staffing Solutions API",
        "company": "AVERRA Staffing Solutions Ltd",
        "database": "connected",
        "timestamp": utc_timestamp(),
    }
