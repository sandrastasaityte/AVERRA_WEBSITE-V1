"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/applications.py
Version: 2.1.0

Public job application API routes.

Features:
- Accepts applications from the AVERRA website.
- Validates applicant information and privacy consent.
- Accepts PDF, DOC and DOCX CV files up to 5 MB.
- Checks file signatures rather than trusting file extensions.
- Stores CV contents directly in the database.
- Links applications to existing published vacancies.
- Supports general applications.
- Sends email notifications after applications are saved.

Administrator application-management routes must remain
in a separate authenticated router.
"""

import logging
import os
import re
import zipfile

from datetime import datetime, timezone
from io import BytesIO
from pathlib import PurePath

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.connection import get_db

from app.models.applications import Application
from app.models.jobs import Job
from app.services.email import send_application_notification


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/applications",
    tags=["Applications"],
)

MAX_CV_SIZE = 5 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
}


def _validate_email(email: str) -> str:
    """Perform basic email address validation."""
    normalized_email = email.strip().lower()

    if len(normalized_email) > 254:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email address is too long.",
        )

    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(pattern, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid email address.",
        )

    return normalized_email


def _validate_cv(
    filename: str,
    content: bytes,
) -> None:
    """Validate CV extension, size and file signature."""
    extension = PurePath(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV must be a PDF, DOC or DOCX file.",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CV is empty.",
        )

    if len(content) > MAX_CV_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="CV must not exceed 5 MB.",
        )

    # PDF signature
    if extension == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is invalid.",
            )

    # Microsoft Word DOC signature
    elif extension == ".doc":
        if not content.startswith(
            bytes.fromhex("D0CF11E0A1B11AE1")
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded DOC file is invalid.",
            )

    # DOCX is a ZIP-based Office document
    elif extension == ".docx":
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                names = archive.namelist()

                if (
                    "[Content_Types].xml" not in names
                    or "word/document.xml" not in names
                ):
                    raise ValueError("Invalid DOCX structure.")

        except (zipfile.BadZipFile, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded DOCX file is invalid.",
            ) from None


def _get_active_job(
    db: Session,
    job_id: int,
) -> Job:
    """Return a published vacancy that has not expired."""
    now = datetime.now(timezone.utc)

    statement = select(Job).where(
        Job.id == job_id,
        Job.status == "published",
        or_(
            Job.closing_date.is_(None),
            Job.closing_date >= now,
        ),
    )

    job = db.scalars(statement).first()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The selected vacancy is no longer available.",
        )

    return job


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def submit_application(
    full_name: str = Form(..., min_length=2, max_length=150),
    email: str = Form(..., max_length=254),
    phone: str | None = Form(default=None, max_length=50),
    job_id: str | None = Form(default=None),
    job_title: str = Form(
        default="General Application",
        max_length=200,
    ),
    cover_letter: str | None = Form(default=None),
    privacy_consent: bool = Form(...),
    cv: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Submit a job application through the public website."""

    full_name = full_name.strip()
    job_title = job_title.strip()
    phone = phone.strip() if phone else None
    cover_letter = cover_letter.strip() if cover_letter else None

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide your full name.",
        )

    email = _validate_email(email)

    if privacy_consent is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Privacy consent is required.",
        )

    if not job_title:
        job_title = "General Application"

    selected_job = None

    if job_id and job_id.strip().lower() not in {
        "",
        "other",
        "null",
        "none",
    }:
        try:
            numeric_job_id = int(job_id)

            if numeric_job_id < 1:
                raise ValueError

        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The selected vacancy is invalid.",
            ) from None

        try:
            selected_job = _get_active_job(
                db,
                numeric_job_id,
            )

        except HTTPException:
            raise

        except SQLAlchemyError:
            logger.exception(
                "Database error while checking vacancy %s.",
                numeric_job_id,
            )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to verify the selected vacancy.",
            ) from None

        job_title = selected_job.title

    elif job_title.lower() in {
        "other",
        "general interest",
        "general application",
    }:
        job_title = "General Application"

    original_filename = os.path.basename(
        (cv.filename or "").replace("\\", "/")
    )

    if not original_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload your CV.",
        )

    try:
        cv_content = await cv.read(MAX_CV_SIZE + 1)
    finally:
        await cv.close()

    _validate_cv(
        original_filename,
        cv_content,
    )

    application = Application(
        full_name=full_name,
        email=email,
        phone=phone,
        job_id=selected_job.id if selected_job else None,
        job_title=job_title,
        cover_letter=cover_letter,
        cv_original_name=original_filename[:255],
        cv_size=len(cv_content),
        cv_content=cv_content,
        privacy_consent=True,
        status="new",
        email_status="pending",
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Failed to save application for %s.",
            email,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to submit your application. Please try again.",
        ) from None

    logger.info(
        "Application %s successfully submitted.",
        application.id,
    )

    # Send notification after saving the application.
    # SMTP failure must not delete or invalidate the application.
    try:
        send_application_notification(
            application_id=application.id,
            full_name=application.full_name,
            email=application.email,
            phone=application.phone,
            job_title=application.job_title,
        )

        application.email_status = "sent"
        db.commit()

    except Exception:
        db.rollback()

        logger.exception(
            "Application %s saved, but email notification failed.",
            application.id,
        )

        try:
            application = db.get(
                Application,
                application.id,
            )

            if application is not None:
                application.email_status = "failed"
                db.commit()

        except SQLAlchemyError:
            db.rollback()

            logger.exception(
                "Unable to update email status for application %s.",
                application.id,
            )

    return {
        "success": True,
        "message": "Your application has been submitted successfully.",
        "application": {
            "id": application.id,
            "full_name": application.full_name,
            "email": application.email,
            "job_title": application.job_title,
            "status": application.status,
            "created_at": (
                application.created_at.isoformat()
                if application.created_at
                else None
            ),
        },
    }