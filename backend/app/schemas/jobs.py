
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/schemas/jobs.py

Pydantic v2 schemas for job vacancies.

Public schemas are used by the website.
Administrative schemas are intended for authenticated management routes.
"""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# ============================================================
# SHARED TYPES
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


# ============================================================
# SHARED VALIDATION HELPERS
# ============================================================

def validate_required_text(value: str) -> str:
    """Reject required text fields containing only whitespace."""
    value = value.strip()

    if not value:
        raise ValueError("This field cannot be blank.")

    return value


def clean_optional_text(value: str | None) -> str | None:
    """Trim optional text and convert empty strings to None."""
    if value is None:
        return None

    value = value.strip()

    return value or None


def validate_optional_email(value: str | None) -> str | None:
    """Validate an optional application email address."""
    value = clean_optional_text(value)

    if value is None:
        return None

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError(
            "Please provide a valid application email address."
        )

    return value.lower()


# ============================================================
# SHARED JOB FIELDS
# ============================================================

class JobBase(BaseModel):
    """Common fields for a job vacancy."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    title: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Job title displayed on the Careers page.",
    )

    department: str | None = Field(
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

    salary_range: str | None = Field(
        default=None,
        max_length=100,
        description="Optional salary range and currency.",
    )

    application_email: str | None = Field(
        default=None,
        max_length=254,
        description="Optional application contact email.",
    )

    closing_date: date | None = Field(
        default=None,
        description="Optional last date for submitting applications.",
    )

    @field_validator(
        "title",
        "location",
        "summary",
        "description",
    )
    @classmethod
    def check_required_text(cls, value: str) -> str:
        return validate_required_text(value)

    @field_validator(
        "department",
        "salary_range",
    )
    @classmethod
    def check_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        return clean_optional_text(value)

    @field_validator("application_email")
    @classmethod
    def check_application_email(
        cls,
        value: str | None,
    ) -> str | None:
        return validate_optional_email(value)


# ============================================================
# CREATE JOB
# ============================================================

class JobCreate(JobBase):
    """Data required to create a vacancy."""

    status: JobStatus = "draft"


# ============================================================
# UPDATE JOB
# ============================================================

class JobUpdate(BaseModel):
    """
    Partial job update schema.

    Only supplied fields should be updated by the route.
    Administrative routes must require authentication and
    authorisation.
    """

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=150,
    )

    department: str | None = Field(
        default=None,
        max_length=100,
    )

    location: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    employment_type: EmploymentType | None = None

    summary: str | None = Field(
        default=None,
        min_length=10,
        max_length=500,
    )

    description: str | None = Field(
        default=None,
        min_length=20,
        max_length=15000,
    )

    salary_range: str | None = Field(
        default=None,
        max_length=100,
    )

    application_email: str | None = Field(
        default=None,
        max_length=254,
    )

    closing_date: date | None = Field(
        default=None,
        description="Optional last date for submitting applications.",
    )

    status: JobStatus | None = None

    @field_validator(
        "title",
        "location",
        "summary",
        "description",
    )
    @classmethod
    def check_supplied_required_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return validate_required_text(value)

    @field_validator(
        "department",
        "salary_range",
    )
    @classmethod
    def check_supplied_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        return clean_optional_text(value)

    @field_validator("application_email")
    @classmethod
    def check_supplied_application_email(
        cls,
        value: str | None,
    ) -> str | None:
        return validate_optional_email(value)

    @model_validator(mode="after")
    def check_update_fields(self) -> "JobUpdate":
        """Require at least one explicitly supplied field."""
        if not self.model_fields_set:
            raise ValueError(
                "At least one field must be supplied for an update."
            )

        return self


# ============================================================
# PUBLIC JOB RESPONSE
# ============================================================

class JobResponse(BaseModel):
    """Fields returned by public vacancy endpoints."""

    model_config = ConfigDict(
        from_attributes=True,
        extra="forbid",
    )

    id: int
    title: str
    department: str | None = None
    location: str
    employment_type: EmploymentType
    summary: str
    description: str
    salary_range: str | None = None
    created_at: datetime
    updated_at: datetime
    closing_date: date | None = None


# ============================================================
# ADMINISTRATIVE JOB RESPONSE
# ============================================================

class JobAdminResponse(JobResponse):
    """
    Extended response for authorised administrators.

    Never expose this schema through unauthenticated routes.
    """

    status: JobStatus
    application_email: EmailStr | None = None
