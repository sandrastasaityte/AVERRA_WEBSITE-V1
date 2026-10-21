
"""
============================================================
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/models/jobs.py
Version: 2.0.0

SQLAlchemy database model for job vacancies.
============================================================
"""

from datetime import datetime, timezone

from sqlalchemy import (
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


class Job(Base):
    """Database model for AVERRA job vacancies."""

    __tablename__ = "jobs"

    __table_args__ = (
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_created_at", "created_at"),
        Index("ix_jobs_location", "location"),
        CheckConstraint(
            "length(trim(title)) > 0",
            name="title_not_empty",
        ),
        CheckConstraint(
            "length(trim(location)) > 0",
            name="location_not_empty",
        ),
        CheckConstraint(
            "length(trim(employment_type)) > 0",
            name="employment_type_not_empty",
        ),
        CheckConstraint(
            "length(trim(summary)) > 0",
            name="summary_not_empty",
        ),
        CheckConstraint(
            "length(trim(description)) > 0",
            name="description_not_empty",
        ),
        CheckConstraint(
            "status IN ('draft', 'published', 'closed', 'archived')",
            name="valid_status",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    department: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    location: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    employment_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    summary: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    salary_range: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    application_email: Mapped[str | None] = mapped_column(
        String(254),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
    )

    closing_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
        """Return a concise representation of this vacancy."""
        return (
            f"<Job("
            f"id={self.id}, "
            f"title={self.title!r}, "
            f"status={self.status!r}"
            f")>"
        )
