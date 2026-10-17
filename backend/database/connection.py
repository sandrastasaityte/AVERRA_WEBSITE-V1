
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/database/connection.py

SQLAlchemy database configuration and session management.
Default database: backend/database/averra.db
"""

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


# ============================================================
# DATABASE PATHS
# ============================================================

# Project backend directory:
# AVERRA_WEBSITE_v1/backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Use the database folder consistently.
DATABASE_DIR = BACKEND_DIR / "database"
DEFAULT_DATABASE_PATH = DATABASE_DIR / "averra.db"

DATABASE_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# DATABASE URL CONFIGURATION
# ============================================================

def resolve_database_url() -> str:
    """
    Resolve DATABASE_URL to an absolute SQLite database path.

    Relative SQLite paths are resolved from the backend directory.
    The default database is backend/database/averra.db.
    """

    configured_url = os.getenv("DATABASE_URL", "").strip()

    if not configured_url:
        configured_path = os.getenv("DATABASE_PATH", "").strip()

        if configured_path:
            path = Path(configured_path)

            if not path.is_absolute():
                path = BACKEND_DIR / path

            path = path.resolve()
        else:
            path = DEFAULT_DATABASE_PATH.resolve()

        return f"sqlite:///{path.as_posix()}"

    # Leave non-SQLite database URLs unchanged.
    if not configured_url.startswith("sqlite:///"):
        return configured_url

    # Preserve an explicitly configured in-memory database.
    if configured_url in (
        "sqlite:///:memory:",
        "sqlite://",
    ):
        return configured_url

    # Extract the path after sqlite:///.
    database_path = configured_url[len("sqlite:///"):]

    # Handle relative paths such as:
    # sqlite:///./database/averra.db
    # sqlite:///database/averra.db
    path = Path(database_path)

    if not path.is_absolute():
        path = BACKEND_DIR / path

    path = path.resolve()

    return f"sqlite:///{path.as_posix()}"


DATABASE_URL = resolve_database_url()

# Keep the resolved value consistent for other modules.
os.environ["DATABASE_URL"] = DATABASE_URL


# ============================================================
# SQLALCHEMY ENGINE
# ============================================================

connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite:")
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
    autocommit=False,
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
    Create missing tables using registered SQLAlchemy models.

    This does not alter existing tables. Use database migrations
    to manage changes to existing schemas.
    """

    # Import models so SQLAlchemy registers their tables.
    from app.models import Base, Enquiry, Job  # noqa: F401

    Base.metadata.create_all(bind=engine)
