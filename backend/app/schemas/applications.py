
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/schemas/applications.py
Version: 1.0.0

Pydantic schemas for application administration.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ------------------------------------------------------------
# APPLICATION STATUS
# ------------------------------------------------------------

ApplicationStatus = Literal[
    "new",
    "reviewing",
    "shortlisted",
    "rejected",
    "hired",
    "withdrawn",
]


# ------------------------------------------------------------
# BASE RESPONSE
# ------------------------------------------------------------

class ApplicationResponse(BaseModel):
    """
    Safe application information for administrator listings.

    CV binary content is intentionally excluded.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None = None

    job_id: int | None = None
    job_title: str

    cover_letter: str | None = None

    cv_original_name: str
    cv_size: int

    privacy_consent: bool
    status: str
    email_status: str

    created_at: datetime


# ------------------------------------------------------------
# APPLICATION DETAIL
# ------------------------------------------------------------

class ApplicationDetail(ApplicationResponse):
    """
    Detailed administrator view of an application.
    """

    pass


# ------------------------------------------------------------
# APPLICATION STATUS UPDATE
# ------------------------------------------------------------

class ApplicationStatusUpdate(BaseModel):
    """
    Validated administrator status update.
    """

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    status: ApplicationStatus


# ------------------------------------------------------------
# APPLICATION LIST
# ------------------------------------------------------------

class ApplicationListResponse(BaseModel):
    """
    Paginated application response.
    """

    items: list[ApplicationResponse]

    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
