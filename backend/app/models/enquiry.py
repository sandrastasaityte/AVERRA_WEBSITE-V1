
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/models/enquiry.py

Database model for website enquiries.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


class Enquiry(Base):
    """Represents a contact enquiry submitted to AVERRA."""

    __tablename__ = "enquiries"

    __table_args__ = (
        Index("ix_enquiries_email", "email"),
        Index("ix_enquiries_status", "status"),
        Index("ix_enquiries_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
    )

    company: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    subject: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        server_default="new",
    )

    internal_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=None,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    def __repr__(self) -> str:
        return (
            f"<Enquiry("
            f"id={self.id}, "
            f"name={self.name!r}, "
            f"email={self.email!r}, "
            f"status={self.status!r}"
            f")>"
        )
