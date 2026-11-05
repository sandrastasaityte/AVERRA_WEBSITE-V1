"""
AVERRA STAFFING SOLUTIONS LTD

File: backend/app/routers/candidate_registrations.py
Version: 1.0.0

Public Careers registration and administrator management API.

Candidate registrations are stored separately from job applications.
"""

from __future__ import annotations

import logging
import os
import secrets
import smtplib
import ssl

from email.message import EmailMessage
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    status,
)
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.connection import get_db
from app.models import CandidateRegistration


logger = logging.getLogger("averra.candidate_registrations")

router = APIRouter(tags=["Candidate Registrations"])


# ============================================================
# CONFIGURATION
# ============================================================

COMPANY_NAME = "AVERRA Staffing Solutions Ltd"

COMPANY_EMAIL = os.getenv(
    "COMPANY_EMAIL",
    "enquiries@averrastaffing.co.uk",
).strip()

COMPANY_WEBSITE = os.getenv(
    "COMPANY_WEBSITE",
    "https://averrastaffing.co.uk",
).strip()

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com",
).strip()

try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
except ValueError:
    SMTP_PORT = 587

SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()

SMTP_FROM_EMAIL = os.getenv(
    "SMTP_FROM_EMAIL",
    SMTP_USERNAME or COMPANY_EMAIL,
).strip()

SMTP_TIMEOUT = 20

REGISTRATION_STATUSES = {
    "new",
    "reviewing",
    "contacted",
    "shortlisted",
    "rejected",
    "withdrawn",
}


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def require_admin(
    x_admin_token: str | None = Header(
        default=None,
        alias="X-Admin-Token",
    ),
) -> None:
    """Require the configured administrator token."""

    expected_token = os.getenv(
        "AVERRA_ADMIN_TOKEN",
        "",
    ).strip()

    normalised = expected_token.lower()

    if (
        not expected_token
        or normalised.startswith("replace-with-")
        or normalised.startswith("replace_with_")
        or normalised in {
            "your-admin-token",
            "your_admin_token",
        }
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrator authentication is not configured.",
        )

    if (
        not x_admin_token
        or not secrets.compare_digest(
            x_admin_token,
            expected_token,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing administrator token.",
        )


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class CandidateRegistrationCreate(BaseModel):
    """Public Careers registration request."""

    model_config = ConfigDict(extra="forbid")

    first_name: str = Field(min_length=1, max_length=75)
    last_name: str = Field(min_length=1, max_length=75)
    email: EmailStr

    nationality: str = Field(min_length=1, max_length=100)
    country_of_residence: str = Field(min_length=1, max_length=100)
    career_area: str = Field(min_length=1, max_length=150)
    professional_experience: str = Field(
        min_length=1,
        max_length=100,
    )

    working_preference: str | None = Field(
        default=None,
        max_length=100,
    )

    skills: str | None = Field(
        default=None,
        max_length=3000,
    )

    additional_info: str | None = Field(
        default=None,
        max_length=2000,
    )

    privacy_consent: bool

    @field_validator(
        "first_name",
        "last_name",
        "nationality",
        "country_of_residence",
        "career_area",
        "professional_experience",
    )
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field is required.")

        return value

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator(
        "working_preference",
        "skills",
        "additional_info",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("privacy_consent")
    @classmethod
    def require_privacy_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError(
                "Privacy acknowledgement is required."
            )

        return value


class CandidateRegistrationStatusUpdate(BaseModel):
    """Administrator status update."""

    model_config = ConfigDict(extra="forbid")

    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()

        if value not in REGISTRATION_STATUSES:
            raise ValueError("Invalid candidate registration status.")

        return value


# ============================================================
# EMAIL DELIVERY
# ============================================================

def send_registration_notification(
    registration: CandidateRegistration,
) -> bool:
    """Notify AVERRA when a candidate registration is received."""

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning(
            "Candidate registration saved, but SMTP credentials "
            "are not configured."
        )
        return False

    message = EmailMessage()

    full_name = (
        f"{registration.first_name} {registration.last_name}"
    )

    message["Subject"] = (
        f"New Careers registration - {full_name} "
        f"(#{registration.id})"
    )

    message["From"] = SMTP_FROM_EMAIL
    message["To"] = COMPANY_EMAIL

    message.set_content(
        f"""
A new candidate registration has been submitted through the AVERRA Careers page.

Company: {COMPANY_NAME}
Registration reference: {registration.id}

Candidate: {full_name}
Email: {registration.email}
Nationality: {registration.nationality}
Country of residence: {registration.country_of_residence}

Career area: {registration.career_area}
Professional experience: {registration.professional_experience}
Working preference: {registration.working_preference or "Not provided"}

Skills and experience:
{registration.skills or "Not provided"}

Additional information:
{registration.additional_info or "Not provided"}

Privacy acknowledgement: Yes
Registration status: {registration.status}

This is a Careers registration, not an application for a specific vacancy.
No CV was uploaded with this registration.

Please log in to the AVERRA administrator system to review the registration.

Website: {COMPANY_WEBSITE}
""".strip()
    )

    try:
        context = ssl.create_default_context()

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT,
        ) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(
                SMTP_USERNAME,
                SMTP_PASSWORD,
            )
            server.send_message(message)

        logger.info(
            "Candidate registration notification sent: id=%s",
            registration.id,
        )

        return True

    except Exception:
        logger.exception(
            "Candidate registration notification failed: id=%s",
            registration.id,
        )

        return False


# ============================================================
# SERIALISATION
# ============================================================

def registration_to_dict(
    registration: CandidateRegistration,
) -> dict[str, Any]:
    """Convert a registration to an administrator API response."""

    return {
        "id": registration.id,
        "first_name": registration.first_name,
        "last_name": registration.last_name,
        "full_name": (
            f"{registration.first_name} {registration.last_name}"
        ),
        "email": registration.email,
        "nationality": registration.nationality,
        "country_of_residence": registration.country_of_residence,
        "career_area": registration.career_area,
        "professional_experience": registration.professional_experience,
        "working_preference": registration.working_preference,
        "skills": registration.skills,
        "additional_info": registration.additional_info,
        "privacy_consent": registration.privacy_consent,
        "status": registration.status,
        "email_status": registration.email_status,
        "created_at": (
            registration.created_at.isoformat()
            if registration.created_at
            else None
        ),
        "updated_at": (
            registration.updated_at.isoformat()
            if registration.updated_at
            else None
        ),
    }


# ============================================================
# PUBLIC: CREATE CANDIDATE REGISTRATION
# ============================================================

@router.post(
    "/api/candidate-registrations",
    status_code=status.HTTP_201_CREATED,
)
def create_candidate_registration(
    registration_data: CandidateRegistrationCreate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Save a Careers registration and notify AVERRA."""

    registration = CandidateRegistration(
        first_name=registration_data.first_name,
        last_name=registration_data.last_name,
        email=str(registration_data.email),
        nationality=registration_data.nationality,
        country_of_residence=registration_data.country_of_residence,
        career_area=registration_data.career_area,
        professional_experience=(
            registration_data.professional_experience
        ),
        working_preference=registration_data.working_preference,
        skills=registration_data.skills,
        additional_info=registration_data.additional_info,
        privacy_consent=True,
        status="new",
        email_status="pending",
    )

    try:
        db.add(registration)
        db.commit()
        db.refresh(registration)

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Could not save candidate registration."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "We could not save your registration. "
                "Please try again later."
            ),
        ) from None

    notification_sent = send_registration_notification(
        registration
    )

    try:
        registration.email_status = (
            "sent" if notification_sent else "failed"
        )

        db.commit()
        db.refresh(registration)

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Could not update candidate registration email status: id=%s",
            registration.id,
        )

        notification_sent = False

    logger.info(
        "Candidate registration saved: id=%s email_status=%s",
        registration.id,
        "sent" if notification_sent else "failed",
    )

    return {
        "success": True,
        "registration_id": registration.id,
        "message": (
            "Thank you. Your Careers registration has been received."
        ),
        "email_status": (
            "sent" if notification_sent else "failed"
        ),
    }


# ============================================================
# ADMIN: LIST CANDIDATE REGISTRATIONS
# ============================================================

@router.get("/api/admin/candidate-registrations")
def list_candidate_registrations(
    _: None = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    registration_status: str | None = Query(
        default=None,
        alias="status",
    ),
    search: str | None = Query(
        default=None,
        max_length=200,
    ),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List candidate registrations for administrators."""

    try:
        statement = select(CandidateRegistration)

        if registration_status:
            normalised_status = registration_status.strip().lower()

            if normalised_status not in REGISTRATION_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid candidate registration status.",
                )

            statement = statement.where(
                CandidateRegistration.status == normalised_status
            )

        if search and search.strip():
            search_term = f"%{search.strip()}%"

            statement = statement.where(
                or_(
                    CandidateRegistration.first_name.ilike(search_term),
                    CandidateRegistration.last_name.ilike(search_term),
                    CandidateRegistration.email.ilike(search_term),
                    CandidateRegistration.career_area.ilike(search_term),
                    CandidateRegistration.country_of_residence.ilike(
                        search_term
                    ),
                )
            )

        statement = (
            statement
            .order_by(
                CandidateRegistration.created_at.desc(),
                CandidateRegistration.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        registrations = db.scalars(statement).all()

        return [
            registration_to_dict(item)
            for item in registrations
        ]

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve candidate registrations."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve candidate registrations.",
        ) from None


# ============================================================
# ADMIN: VIEW ONE CANDIDATE REGISTRATION
# ============================================================

@router.get("/api/admin/candidate-registrations/{registration_id}")
def get_candidate_registration(
    registration_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve one candidate registration."""

    try:
        registration = db.get(
            CandidateRegistration,
            registration_id,
        )

        if registration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate registration not found.",
            )

        return registration_to_dict(registration)

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve candidate registration id=%s",
            registration_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve candidate registration.",
        ) from None


# ============================================================
# ADMIN: UPDATE REGISTRATION STATUS
# ============================================================

@router.patch("/api/admin/candidate-registrations/{registration_id}")
def update_candidate_registration(
    registration_id: int,
    registration_data: CandidateRegistrationStatusUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Update a candidate registration's processing status."""

    try:
        registration = db.get(
            CandidateRegistration,
            registration_id,
        )

        if registration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate registration not found.",
            )

        registration.status = registration_data.status

        db.commit()
        db.refresh(registration)

        logger.info(
            "Candidate registration updated: id=%s status=%s",
            registration.id,
            registration.status,
        )

        return registration_to_dict(registration)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Could not update candidate registration id=%s",
            registration_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update candidate registration.",
        ) from None


# ============================================================
# ADMIN: DELETE REGISTRATION
# ============================================================

@router.delete("/api/admin/candidate-registrations/{registration_id}")
def delete_candidate_registration(
    registration_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Permanently delete one candidate registration."""

    try:
        registration = db.get(
            CandidateRegistration,
            registration_id,
        )

        if registration is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate registration not found.",
            )

        db.delete(registration)
        db.commit()

        logger.warning(
            "Administrator deleted candidate registration id=%s",
            registration_id,
        )

        return {
            "success": True,
            "message": "Candidate registration deleted successfully.",
            "id": registration_id,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Could not delete candidate registration id=%s",
            registration_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete candidate registration.",
        ) from None