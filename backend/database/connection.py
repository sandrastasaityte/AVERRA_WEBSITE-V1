"""
============================================================
AVERRA STAFFING SOLUTIONS LTD
File: backend/database/connection.py

SQLAlchemy database configuration and session management.
============================================================
"""

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


# ------------------------------------------------------------
# DATABASE CONFIGURATION
# ------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent.parent

DEFAULT_DATABASE_URL = (
    f"sqlite:///{(BACKEND_DIR / 'data' / 'averra.db').as_posix()}"
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    DEFAULT_DATABASE_URL,
)

# Create the default database directory when using the
# default SQLite database.
if DATABASE_URL == DEFAULT_DATABASE_URL:
    (BACKEND_DIR / "data").mkdir(
        parents=True,
        exist_ok=True,
    )

# SQLite requires check_same_thread=False for this application.
connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)


# ------------------------------------------------------------
# SQLALCHEMY ENGINE
# ------------------------------------------------------------

engine: Engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)


# ------------------------------------------------------------
# DATABASE SESSION
# ------------------------------------------------------------

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    Provide a database session for a FastAPI request.

    The session is closed after the request finishes.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------
# DATABASE TABLE INITIALISATION
# ------------------------------------------------------------

def create_tables() -> None:
    """
    Register all models and create any missing tables.

    Existing tables and records are not deliberately deleted.
    """

    # Importing these models registers their tables with Base.
    from app.models import Base, Enquiry, Job  # noqa: F401

    Base.metadata.create_all(bind=engine)