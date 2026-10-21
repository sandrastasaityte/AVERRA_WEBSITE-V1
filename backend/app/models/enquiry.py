
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/models/enquiry.py

SQLAlchemy database model for website enquiries.
Stores contact details, enquiry messages, processing status,
internal notes, and creation/update timestamps.
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


class Enquiry(Base):
    """Represents a contact enquiry submitted to AVERRA."""

    __tablename__ = "enquiries"

    __table_args__ = (
        Index("ix_enquiries_email", "email"),
        Index("ix_enquiries_status", "status"),
        Index("ix_enquiries_created_at", "created_at"),
        CheckConstraint(
            "length(trim(name)) > 0",
            name="name_not_empty",
        ),
        CheckConstraint(
            "length(trim(email)) > 0",
            name="email_not_empty",
        ),
        CheckConstraint(
            "length(trim(message)) > 0",
            name="message_not_empty",
        ),
        CheckConstraint(
            "status IN ('new', 'in_progress', 'responded', 'closed', 'spam')",
            name="valid_status",
        ),
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
        index=False,
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
        server_default=text("'new'"),
    )

    internal_notes: Mapped[str | None] = mapped_column(
        Text,
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
        """Return a concise representation without exposing message contents."""
        return (
            f"<Enquiry("
            f"id={self.id}, "
            f"name={self.name!r}, "
            f"email={self.email!r}, "
            f"status={self.status!r}"
            f")>"
        )
