
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/schemas/enquiry.py

Pydantic v2 schemas for customer enquiries.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


EnquiryStatus = Literal[
    "new",
    "in_progress",
    "responded",
    "closed",
]


class EnquiryBase(BaseModel):
    """Shared fields for customer enquiries."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Full name of the person making the enquiry.",
    )

    email: EmailStr = Field(
        ...,
        description="Valid contact email address.",
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=40,
    )

    company: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    subject: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    message: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Message submitted through the contact form.",
    )

    @field_validator("name", "message")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        """Reject empty or whitespace-only required fields."""
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value

    @field_validator("phone", "company", "subject")
    @classmethod
    def clean_optional_text(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        """Normalise empty optional fields."""
        if value is None:
            return None

        value = value.strip()
        return value or None

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        """Allow common international phone number characters."""
        if value is None:
            return None

        import re

        if not re.fullmatch(r"[0-9+() .\-]{5,40}", value):
            raise ValueError(
                "Please enter a valid phone number."
            )

        return value


class EnquiryCreate(EnquiryBase):
    """Request schema for submitting a new enquiry."""

    pass


class EnquiryResponse(BaseModel):
    """Safe enquiry response for the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    company: Optional[str] = None
    status: EnquiryStatus = "new"
    created_at: datetime


class EnquiryDetail(EnquiryResponse):
    """Extended enquiry details for authorised staff."""

    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
    internal_notes: Optional[str] = None
    updated_at: datetime


class EnquiryStatusUpdate(BaseModel):
    """Request schema for updating an enquiry's workflow status."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    status: EnquiryStatus

    internal_notes: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    @field_validator("internal_notes")
    @classmethod
    def clean_internal_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None

        value = value.strip()
        return value or None
