
"""
AVERRA STAFFING SOLUTIONS LTD
File: app/models/job.py

SQLAlchemy database model for job vacancies.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Job(Base):
    """Represents a job vacancy managed by AVERRA."""

    __tablename__ = "jobs"

    __table_args__ = (
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_created_at", "created_at"),
        Index("ix_jobs_location", "location"),
    )

    # Unique job identifier
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Main vacancy information
    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    department: Mapped[Optional[str]] = mapped_column(
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

    salary_range: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    application_email: Mapped[Optional[str]] = mapped_column(
        String(254),
        nullable=True,
    )

    # draft = hidden, published = public, closed = no longer accepting
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="draft",
        server_default="draft",
    )

    # Optional closing date for applications
    closing_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Record timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return (
            f"<Job("
            f"id={self.id}, "
            f"title={self.title!r}, "
            f"location={self.location!r}, "
            f"status={self.status!r}"
            f")>"
        )
