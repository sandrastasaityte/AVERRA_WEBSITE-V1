
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/database/connection.py

SQLAlchemy database configuration and session management.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# backend/ is the parent of this database directory
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Default SQLite database location:
# backend/database/averra.db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{(BACKEND_DIR / 'database' / 'averra.db').as_posix()}",
)

# SQLite requires this option for connections used by FastAPI.
connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db():
    """
    Provide a database session to a FastAPI endpoint.

    The session is always closed after the request.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """
    Create tables registered with the SQLAlchemy declarative base.

    Import models before calling this function so SQLAlchemy
    knows which tables to create.
    """
    from app.models.base import Base
    from app.models.enquiry import Enquiry
    from app.models.job import Job

    # References above intentionally register both models.
    _ = (Enquiry, Job)

    Base.metadata.create_all(bind=engine)
