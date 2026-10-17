
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/jobs.py

Public job vacancy API routes.

Only published vacancies that have not passed their
closing date are available through the public API.
Job-management routes require a separate authenticated router.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.job import Job
from app.schemas.jobs import JobResponse


router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)


def _get_public_job_statement():
    """Build a query for currently available public vacancies."""

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
)
def list_published_jobs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Job]:
    """List published, unexpired vacancies for the Careers page."""

    statement = (
        _get_public_job_statement()
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


@router.get(
    "/{job_id}",
    response_model=JobResponse,
)
def get_published_job(
    job_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
) -> Job:
    """Return one published vacancy that has not expired."""

    statement = _get_public_job_statement().where(
        Job.id == job_id
    )

    job = db.scalars(statement).first()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job vacancy not found.",
        )

    return job


# IMPORTANT:
# Do not expose public create, update or delete endpoints.
# Implement those operations in a separate authenticated
# administrator router before deploying job management.
