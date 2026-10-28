
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/jobs.py
Version: 2.0.0

Public job vacancy API routes.

Only published vacancies that have not passed their closing date
are available through the public API.

Job-management routes must use a separate authenticated router.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.jobs import Job
from app.schemas.jobs import JobResponse


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)


def _get_public_job_statement():
    """Build a query for published vacancies that have not expired."""
    now = datetime.now(timezone.utc)

    return select(Job).where(
        Job.status == "published",
        or_(
            Job.closing_date.is_(None),
            Job.closing_date >= now,
        ),
    )


@router.get(
    "",
    response_model=list[JobResponse],
    status_code=status.HTTP_200_OK,
)
def list_published_jobs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Job]:
    """List published, unexpired vacancies for the Careers page."""
    statement = (
        _get_public_job_statement()
        .order_by(Job.created_at.desc(), Job.id.desc())
        .offset(skip)
        .limit(limit)
    )

    try:
        return list(db.scalars(statement).all())

    except SQLAlchemyError:
        logger.exception("Failed to retrieve public job vacancies.")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve job vacancies. Please try again later.",
        ) from None


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    status_code=status.HTTP_200_OK,
)
def get_published_job(
    job_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
) -> Job:
    """Return one published vacancy that has not expired."""
    statement = _get_public_job_statement().where(Job.id == job_id)

    try:
        job = db.scalars(statement).first()

    except SQLAlchemyError:
        logger.exception(
            "Failed to retrieve public job vacancy with ID %s.",
            job_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve this job vacancy. Please try again later.",
        ) from None

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job vacancy not found.",
        )

    return job


# Security:
# Do not add public create, update, or delete endpoints here.
# Job-management operations belong in a separately authenticated
# administrator router with appropriate authorization checks.
