
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/database/connection.py

SQLAlchemy database configuration and session management.
Default database: backend/database/averra.db
"""

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


# ============================================================
# DATABASE PATHS
# ============================================================

# Project backend directory:
# AVERRA_WEBSITE_v1/backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent

DATABASE_DIR = BACKEND_DIR / "database"
DEFAULT_DATABASE_PATH = DATABASE_DIR / "averra.db"

DATABASE_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# DATABASE URL CONFIGURATION
# ============================================================

def resolve_database_url() -> str:
    """
    Resolve the configured database URL.

    Relative SQLite file paths are resolved from the backend
    directory. The default database is backend/database/averra.db.
    Non-SQLite database URLs are preserved.
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

    # Preserve supported SQLite in-memory URL forms.
    if configured_url in ("sqlite://", "sqlite:///:memory:"):
        return configured_url

    # Leave other database URLs unchanged.
    if not configured_url.startswith("sqlite:///"):
        return configured_url

    database_path = configured_url[len("sqlite:///"):]

    # On Windows, sqlite:///C:/... is an absolute path.
    # On Unix, absolute paths begin with /.
    path = Path(database_path)

    if not path.is_absolute():
        path = BACKEND_DIR / path

    path = path.resolve()
    return f"sqlite:///{path.as_posix()}"


DATABASE_URL = resolve_database_url()

# Keep the resolved URL available to modules that read the
# environment after this module has been imported.
os.environ["DATABASE_URL"] = DATABASE_URL


# ============================================================
# SQLALCHEMY ENGINE
# ============================================================

is_sqlite = DATABASE_URL.startswith("sqlite:")

connect_args = (
    {"check_same_thread": False}
    if is_sqlite
    else {}
)

engine: Engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=os.getenv("SQL_ECHO", "false").strip().lower()
    in {"1", "true", "yes", "on"},
)


# SQLite foreign-key enforcement is disabled by default.
# Enable it on every SQLite connection.
if is_sqlite:

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        """Enable SQLite foreign-key enforcement."""
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()


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

    The session is always closed after the request finishes.
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

    This does not alter existing tables. Use migrations to
    manage changes to existing database schemas.
    """
    from app.models import Base, Enquiry, Job  # noqa: F401

    Base.metadata.create_all(bind=engine)
