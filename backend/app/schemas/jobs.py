
"""
AVERRA STAFFING SOLUTIONS LTD
File: app/schemas/jobs.py

Pydantic schemas for job vacancies.
Compatible with Pydantic v2.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# SHARED JOB FIELDS
# ============================================================

EmploymentType = Literal[
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Freelance",
    "Internship",
]

JobStatus = Literal[
    "draft",
    "published",
    "closed",
]


class JobBase(BaseModel):
    """Common fields for a job vacancy."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Job title displayed on the Careers page.",
    )

    department: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Department or professional field.",
    )

    location: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Location, such as Remote - India or Leeds, UK.",
    )

    employment_type: EmploymentType = Field(
        ...,
        description="Type of employment offered.",
    )

    summary: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Short description displayed in job cards.",
    )

    description: str = Field(
        ...,
        min_length=20,
        max_length=15000,
        description="Full job description and responsibilities.",
    )

    salary_range: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional salary range and currency.",
    )

    application_email: Optional[str] = Field(
        default=None,
        max_length=254,
        description="Optional application contact email.",
    )

    @field_validator(
        "title",
        "location",
        "summary",
        "description",
    )
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        """Reject blank required fields."""
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value

    @field_validator(
        "department",
        "salary_range",
        "application_email",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        """Convert empty optional fields to None."""
        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("application_email")
    @classmethod
    def validate_application_email(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        """Perform basic email format validation."""
        if value is None:
            return None

        import re

        if not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            value,
        ):
            raise ValueError(
                "Please provide a valid application email address."
            )

        return value.lower()


# ============================================================
# CREATE JOB
# ============================================================

class JobCreate(JobBase):
    """
    Data required to create a vacancy.

    Administrative routes should require authentication.
    """

    status: JobStatus = "draft"


# ============================================================
# UPDATE JOB
# ============================================================

class JobUpdate(BaseModel):
    """
    Partial job update schema.

    Only supplied fields are intended to be updated.
    Administrative routes should require authentication.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=150,
    )

    department: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    location: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    employment_type: Optional[EmploymentType] = None

    summary: Optional[str] = Field(
        default=None,
        min_length=10,
        max_length=500,
    )

    description: Optional[str] = Field(
        default=None,
        min_length=20,
        max_length=15000,
    )

    salary_range: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    application_email: Optional[str] = Field(
        default=None,
        max_length=254,
    )

    status: Optional[JobStatus] = None


# ============================================================
# PUBLIC JOB RESPONSE
# ============================================================

class JobResponse(BaseModel):
    """Fields returned by public vacancy endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    department: Optional[str] = None
    location: str
    employment_type: str
    summary: str
    description: str
    salary_range: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ============================================================
# ADMINISTRATIVE JOB RESPONSE
# ============================================================

class JobAdminResponse(JobResponse):
    """
    Extended response for authorised administrators.
    Never expose this schema through public admin-free routes.
    """

    status: JobStatus
