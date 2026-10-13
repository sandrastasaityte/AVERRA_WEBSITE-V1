
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/jobs.py

Job vacancy API routes.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.job import Job
from app.schemas.jobs import (
    JobAdminResponse,
    JobCreate,
    JobResponse,
    JobUpdate,
)

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)


def _get_job_or_404(db: Session, job_id: int) -> Job:
    """Return a job or raise HTTP 404."""
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job vacancy not found.",
        )

    return job


@router.get("", response_model=list[JobResponse])
def list_published_jobs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List published vacancies for the public Careers page."""
    statement = (
        select(Job)
        .where(Job.status == "published")
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return db.scalars(statement).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_published_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Return one published vacancy."""
    job = _get_job_or_404(db, job_id)

    if job.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job vacancy not found.",
        )

    return job


# IMPORTANT:
# The following management endpoints are intentionally not exposed
# until authentication and authorisation are implemented.
# Do not add public create, update, or delete routes without securing
# them first. Use an authenticated admin router for those operations.
