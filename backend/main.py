
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/main.py
Version: 4.1.0

FastAPI application for the AVERRA website.

Features:
- Environment configuration
- Shared SQLAlchemy database connection
- Safe database initialisation and compatibility migrations
- API health checks
- Public website contact enquiries
- Public published job vacancies
- Protected job administration
- Create, edit, publish and close vacancies
- CORS configuration for local development and production
- Application logging
- Interactive API documentation

Run from the backend directory:
    python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


# ============================================================
# PATHS AND ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATABASE_DIR = BASE_DIR / "database"
LOG_DIR = BASE_DIR / "logs"
UPLOAD_DIR = BASE_DIR / "uploads"

# Load the backend's environment file before importing the database.
load_dotenv(BASE_DIR / ".env", override=True)

for directory in (DATABASE_DIR, LOG_DIR, UPLOAD_DIR):
    directory.mkdir(parents=True, exist_ok=True)

APP_NAME = os.getenv(
    "APP_NAME",
    "AVERRA Staffing Solutions API",
).strip()

APP_VERSION = os.getenv("APP_VERSION", "4.1.0").strip()

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

DEBUG = (
    os.getenv("DEBUG", "false").strip().lower()
    in {"true", "1", "yes"}
)

if APP_ENV == "production":
    DEBUG = False

COMPANY_NAME = "AVERRA Staffing Solutions Ltd"

COMPANY_EMAIL = os.getenv(
    "COMPANY_EMAIL",
    "info@averrastaffing.co.uk",
).strip()

COMPANY_WEBSITE = os.getenv(
    "COMPANY_WEBSITE",
    "https://averrastaffing.co.uk",
).strip()


# ============================================================
# DATABASE URL CONFIGURATION
# ============================================================

DEFAULT_DATABASE_URL = (
    f"sqlite:///{(DATABASE_DIR / 'averra.db').as_posix()}"
)

database_url = os.getenv("DATABASE_URL", "").strip()

if not database_url:
    configured_path = os.getenv("DATABASE_PATH", "").strip()

    if configured_path:
        path = Path(configured_path)

        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()

        database_url = f"sqlite:///{path.as_posix()}"
    else:
        database_url = DEFAULT_DATABASE_URL

# Resolve relative SQLite paths against the backend directory.
if (
    database_url.startswith("sqlite:///")
    and not database_url.startswith("sqlite:////")
):
    sqlite_path = database_url[len("sqlite:///"):]
    path = Path(sqlite_path)

    if not path.is_absolute():
        path = (BASE_DIR / path).resolve()

    path.parent.mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{path.as_posix()}"

os.environ["DATABASE_URL"] = database_url


# ============================================================
# APPLICATION IMPORTS
# ============================================================

from database.connection import (  # noqa: E402
    create_tables,
    engine,
    get_db,
)

from app.models import Base, Enquiry, Job  # noqa: E402

from app.schemas.enquiry import (  # noqa: E402
    EnquiryCreate,
    EnquiryResponse,
)

from app.schemas.jobs import (  # noqa: E402
    JobCreate,
    JobUpdate,
    JobResponse,
    JobAdminResponse,
)


# ============================================================
# LOGGING
# ============================================================

LOG_LEVEL_NAME = os.getenv("LOG_LEVEL", "INFO").strip().upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME, logging.INFO)

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            LOG_DIR / "application.log",
            encoding="utf-8",
        ),
    ],
)

logger = logging.getLogger("averra")


# ============================================================
# DATABASE INITIALISATION AND COMPATIBILITY
# ============================================================

def migrate_existing_database() -> None:
    """
    Add supported columns to existing SQLite tables.

    This compatibility migration preserves existing records.
    Future schema changes should use versioned migrations.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "enquiries" in tables:
            columns = {
                column["name"]
                for column in inspect(connection).get_columns(
                    "enquiries"
                )
            }

            if "internal_notes" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE enquiries "
                        "ADD COLUMN internal_notes TEXT"
                    )
                )
                logger.info("Added enquiries.internal_notes")

        if "jobs" in tables:
            columns = {
                column["name"]
                for column in inspect(connection).get_columns("jobs")
            }

            if "closing_date" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE jobs "
                        "ADD COLUMN closing_date DATETIME"
                    )
                )
                logger.info("Added jobs.closing_date")


def initialise_database() -> None:
    """Create missing tables and apply compatible schema changes."""
    # Ensure model metadata has been registered.
    _ = Base.metadata

    create_tables()
    migrate_existing_database()

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    logger.info("Database initialised successfully")


def utc_now() -> datetime:
    """Return the current UTC time."""
    return datetime.now(timezone.utc)


# ============================================================
# APPLICATION LIFECYCLE
# ============================================================

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialise the database and dispose of the engine on shutdown."""
    logger.info("%s starting in %s mode", APP_NAME, APP_ENV)

    try:
        initialise_database()
    except Exception:
        logger.exception("Application startup failed")
        engine.dispose()
        raise

    try:
        yield
    finally:
        logger.info("%s shutting down", APP_NAME)
        engine.dispose()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=APP_NAME,
    description=(
        "The API for AVERRA Staffing Solutions Ltd, connecting "
        "UK businesses with skilled professionals based in India."
    ),
    version=APP_VERSION,
    debug=DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

DEFAULT_ORIGINS = [
    "http://localhost:63342",
    "http://127.0.0.1:63342",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://averrastaffing.co.uk",
    "https://www.averrastaffing.co.uk",
]

configured_origins = os.getenv("CORS_ORIGINS", "").strip()

if configured_origins:
    allowed_origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = DEFAULT_ORIGINS.copy()

# In development, always permit the known local development origins,
# even if CORS_ORIGINS is already set in .env.
if APP_ENV != "production":
    local_development_origins = [
        "http://localhost:63342",
        "http://127.0.0.1:63342",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    allowed_origins.extend(local_development_origins)

# Remove duplicates while preserving order.
allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "PATCH",
        "OPTIONS",
    ],
    allow_headers=[
        "Accept",
        "Content-Type",
        "X-Admin-Token",
    ],
)


# ============================================================
# GENERAL ENDPOINTS
# ============================================================

@app.get("/", tags=["General"])
def home() -> dict[str, Any]:
    """Return basic API information."""
    return {
        "name": APP_NAME,
        "company": COMPANY_NAME,
        "version": APP_VERSION,
        "status": "running",
        "documentation": "/docs",
        "health_check": "/api/health",
        "jobs_endpoint": "/api/jobs",
        "enquiries_endpoint": "/api/enquiries",
        "admin_jobs_endpoint": "/api/admin/jobs",
    }


@app.get("/api/health", tags=["General"])
def health_check() -> dict[str, str]:
    """Check whether the API can reach its database."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "service": APP_NAME,
            "database": "connected",
            "timestamp": utc_now().isoformat(),
        }

    except SQLAlchemyError:
        logger.exception("Database health check failed")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable.",
        ) from None


# ============================================================
# WEBSITE CONTACT ENQUIRIES
# ============================================================

@app.post(
    "/api/enquiries",
    response_model=EnquiryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Enquiries"],
)
def create_enquiry(
    enquiry_data: EnquiryCreate,
    db: Session = Depends(get_db),
):
    """Save a contact enquiry submitted through the website."""
    enquiry = Enquiry(
        name=enquiry_data.name,
        email=str(enquiry_data.email).strip().lower(),
        phone=enquiry_data.phone,
        company=enquiry_data.company,
        subject=enquiry_data.subject,
        message=enquiry_data.message,
        status="new",
    )

    try:
        db.add(enquiry)
        db.commit()
        db.refresh(enquiry)

        logger.info("Contact enquiry received: id=%s", enquiry.id)
        return enquiry

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not save contact enquiry")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to save your enquiry. "
                "Please try again later."
            ),
        ) from None


# ============================================================
# PUBLIC JOB VACANCIES
# ============================================================

@app.get(
    "/api/jobs",
    response_model=list[JobResponse],
    tags=["Jobs"],
)
def list_jobs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Return published vacancies only."""
    try:
        statement = (
            select(Job)
            .where(Job.status == "published")
            .order_by(Job.created_at.desc(), Job.id.desc())
            .offset(offset)
            .limit(limit)
        )

        return db.scalars(statement).all()

    except SQLAlchemyError:
        logger.exception("Could not retrieve published jobs")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve vacancies.",
        ) from None


@app.get(
    "/api/jobs/{job_id}",
    response_model=JobResponse,
    tags=["Jobs"],
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Return one published vacancy."""
    try:
        statement = select(Job).where(
            Job.id == job_id,
            Job.status == "published",
        )
        job = db.scalars(statement).first()

    except SQLAlchemyError:
        logger.exception("Could not retrieve vacancy id=%s", job_id)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve this vacancy.",
        ) from None

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found.",
        )

    return job


# ============================================================
# ADMINISTRATOR AUTHENTICATION
# ============================================================

def require_admin(
    x_admin_token: str | None = Header(
        default=None,
        alias="X-Admin-Token",
    ),
) -> None:
    """Require the configured private administrator token."""
    expected_token = os.getenv("AVERRA_ADMIN_TOKEN", "").strip()

    if (
        not expected_token
        or expected_token.startswith("REPLACE_WITH_")
        or expected_token
        == "replace_with_your_own_long_random_secret"
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrator authentication is not configured.",
        )

    if (
        not x_admin_token
        or not secrets.compare_digest(x_admin_token, expected_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing administrator token.",
        )


# ============================================================
# ADMIN: LIST CONTACT ENQUIRIES
# ============================================================

@app.get(
    "/api/admin/enquiries",
    tags=["Admin - Enquiries"],
)
def list_admin_enquiries(
    _: None = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    enquiry_status: str | None = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
):
    """List saved website enquiries for authenticated administrators."""

    try:
        statement = select(Enquiry)

        if enquiry_status:
            allowed_statuses = {
                "new",
                "in_progress",
                "responded",
                "closed",
            }

            if enquiry_status not in allowed_statuses:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid enquiry status.",
                )

            statement = statement.where(
                Enquiry.status == enquiry_status
            )

        statement = (
            statement
            .order_by(
                Enquiry.created_at.desc(),
                Enquiry.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        enquiries = db.scalars(statement).all()

        return [
            {
                "id": enquiry.id,
                "name": enquiry.name,
                "email": enquiry.email,
                "phone": enquiry.phone,
                "company": enquiry.company,
                "subject": enquiry.subject,
                "message": enquiry.message,
                "status": enquiry.status,
                "created_at": (
                    enquiry.created_at.isoformat()
                    if enquiry.created_at
                    else None
                ),
            }
            for enquiry in enquiries
        ]

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve administrator enquiries"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve contact enquiries.",
        ) from None

# ============================================================
# ADMIN: CREATE VACANCY
# ============================================================

@app.post(
    "/api/admin/jobs",
    response_model=JobAdminResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Admin - Jobs"],
)
def create_job(
    job_data: JobCreate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a vacancy as a draft or published job."""
    job = Job(**job_data.model_dump())

    try:
        db.add(job)
        db.commit()
        db.refresh(job)

        logger.info("Administrator created job id=%s", job.id)
        return job

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not create job vacancy")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the job vacancy.",
        ) from None


# ============================================================
# ADMIN: LIST ALL VACANCIES
# ============================================================

@app.get(
    "/api/admin/jobs",
    response_model=list[JobAdminResponse],
    tags=["Admin - Jobs"],
)
def list_admin_jobs(
    _: None = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List all vacancies. Administrator authentication is required."""
    try:
        statement = (
            select(Job)
            .order_by(Job.created_at.desc(), Job.id.desc())
            .offset(offset)
            .limit(limit)
        )

        return db.scalars(statement).all()

    except SQLAlchemyError:
        logger.exception("Could not retrieve administrator job list")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve job vacancies.",
        ) from None


# ============================================================
# ADMIN: EDIT, PUBLISH OR CLOSE A VACANCY
# ============================================================

@app.patch(
    "/api/admin/jobs/{job_id}",
    response_model=JobAdminResponse,
    tags=["Admin - Jobs"],
)
def update_job(
    job_id: int,
    job_data: JobUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Partially update a vacancy."""
    try:
        job = db.get(Job, job_id)

        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job vacancy not found.",
            )

        updates = job_data.model_dump(exclude_unset=True)

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provide at least one field to update.",
            )

        for field, value in updates.items():
            setattr(job, field, value)

        if hasattr(job, "updated_at"):
            job.updated_at = utc_now()

        db.commit()
        db.refresh(job)

        logger.info("Administrator updated job id=%s", job.id)
        return job

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not update job id=%s", job_id)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the job vacancy.",
        ) from None


# ============================================================
# STARTUP
# ============================================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1").strip()
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=APP_ENV == "development",
    )
