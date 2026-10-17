
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/database/connection.py

SQLAlchemy database configuration and session management.
"""

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

# Project backend directory:
# AVERRA_WEBSITE_v1/backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BACKEND_DIR / "data"
DEFAULT_DATABASE_PATH = DATA_DIR / "averra.db"

DEFAULT_DATABASE_URL = (
    f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    DEFAULT_DATABASE_URL,
)

if DATABASE_URL.startswith("sqlite:///"):
    DATA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# SQLALCHEMY ENGINE
# ============================================================

connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine: Engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
)


# ============================================================
# DATABASE SESSION
# ============================================================

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    Provide a SQLAlchemy session to a FastAPI request.

    The session is closed after the request finishes.
    Routes are responsible for committing or rolling back
    transactions when appropriate.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# DATABASE TABLE INITIALISATION
# ============================================================

def create_tables() -> None:
    """
    Create missing tables using the registered SQLAlchemy models.

    This does not execute SQL migration files or alter existing
    tables. Use migrations to manage schema changes.
    """
    # Import models so SQLAlchemy registers their tables.
    from app.models import Base, Enquiry, Job  # noqa: F401

    Base.metadata.create_all(bind=engine)
