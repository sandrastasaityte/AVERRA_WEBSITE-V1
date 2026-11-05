
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/models/candidate_registrations.py
Version: 1.0.0

SQLAlchemy database model for Careers candidate registrations.
Registrations are stored separately from job applications.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

# Import Base directly from base.py.
# Do not import CandidateRegistration from app.models here.
from .base import Base


class CandidateRegistration(Base):
    """Candidate profile submitted through the AVERRA Careers page."""

    __tablename__ = "candidate_registrations"

    __table_args__ = (
        CheckConstraint(
            "privacy_consent = 1",
            name="privacy_consent_required",
        ),
        CheckConstraint(
            "status IN ('new', 'reviewing', 'contacted', "
            "'shortlisted', 'rejected', 'withdrawn')",
            name="valid_registration_status",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
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
        index=True,
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
        default=True,
        server_default="1",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        server_default="new",
        index=True,
    )

    email_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
