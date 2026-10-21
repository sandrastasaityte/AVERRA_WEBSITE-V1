
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/models/base.py

Shared SQLAlchemy declarative base.

Provides a common metadata configuration and predictable database
constraint names for all AVERRA database models.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """
    Base class for all AVERRA SQLAlchemy models.

    All application models should inherit from this class so they
    share the same metadata and naming conventions.
    """

    metadata = MetaData(
        naming_convention=NAMING_CONVENTION,
    )
