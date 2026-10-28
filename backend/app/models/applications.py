
"""
AVERRA STAFFING SOLUTIONS LTD
Database model for website job applications.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


def utc_now() -> datetime:
    """Return the current UTC time."""
    return datetime.now(timezone.utc)


class Application(Base):
    """Store submitted job applications and their CV files."""

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    job_title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        default="General Application",
    )

    cover_letter: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    cv_original_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    cv_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # Store CV bytes in the database so they are not dependent
    # on Render's temporary local filesystem.
    cv_content: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
    )

    privacy_consent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        index=True,
    )

    email_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )
