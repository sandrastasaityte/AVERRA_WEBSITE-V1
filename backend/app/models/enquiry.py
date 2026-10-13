
"""
AVERRA STAFFING SOLUTIONS LTD
File: app/models/enquiry.py

Database model for website enquiries.

Requirements:
    sqlalchemy>=2.0,<3.0
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


class Enquiry(Base):
    """Represents a contact enquiry submitted to AVERRA."""

    __tablename__ = "enquiries"

    __table_args__ = (
        Index("ix_enquiries_email", "email"),
        Index("ix_enquiries_status", "status"),
        Index("ix_enquiries_created_at", "created_at"),
    )

    # Unique database identifier
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Contact details
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )

    phone: Mapped[Optional[str]] = mapped_column(
        String(40),
        nullable=True,
    )

    company: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
    )

    subject: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Workflow status for the admin dashboard
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        server_default="new",
    )

    # Internal notes for authorised staff
    internal_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Creation and modification timestamps
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
            f"<Enquiry("
            f"id={self.id}, "
            f"name={self.name!r}, "
            f"email={self.email!r}, "
            f"status={self.status!r}"
            f")>"
        )
