"""
AVERRA STAFFING SOLUTIONS LTD

File: backend/app/models/candidate_registration.py

SQLAlchemy database model for Careers page registrations.

Stores candidate contact details, professional background,
working preferences, privacy consent and registration status.

Version: 1.0.0
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class CandidateRegistration(Base):
    """Represents a candidate registration submitted through Careers."""

    __tablename__ = "candidate_registrations"

    __table_args__ = (
        Index(
            "ix_candidate_registrations_email",
            "email",
        ),
        Index(
            "ix_candidate_registrations_status",
            "status",
        ),
        Index(
            "ix_candidate_registrations_created_at",
            "created_at",
        ),
        CheckConstraint(
            "length(trim(first_name)) > 0",
            name="first_name_not_empty",
        ),
        CheckConstraint(
            "length(trim(last_name)) > 0",
            name="last_name_not_empty",
        ),
        CheckConstraint(
            "length(trim(email)) > 0",
            name="email_not_empty",
        ),
        CheckConstraint(
            "privacy_consent = 1",
            name="privacy_consent_required",
        ),
        CheckConstraint(
            "status IN "
            "('new', 'reviewing', 'contacted', "
            "'shortlisted', 'rejected', 'withdrawn')",
            name="valid_status",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(75),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(75),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )

    nationality: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    country_of_residence: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    career_area: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    professional_experience: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    working_preference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    skills: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    additional_info: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    privacy_consent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        server_default=text("'new'"),
    )

    email_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    def __repr__(self) -> str:
        """Return a concise representation without exposing candidate details."""
        return (
            f"<CandidateRegistration("
            f"id={self.id}, "
            f"email={self.email!r}, "
            f"status={self.status!r}"
            f")>"
        )