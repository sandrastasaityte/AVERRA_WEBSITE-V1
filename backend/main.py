"""
============================================================
AVERRA STAFFING SOLUTIONS LTD
File: backend/main.py
Version: 3.0.0

Main FastAPI application.

Features:
- Environment configuration
- Shared SQLAlchemy database connection
- SQLite compatibility migrations
- Health checks
- Website contact enquiries
- Public published job vacancies
- Protected job administration
- Create, edit, publish and close vacancies
- CORS configuration
- Application logging
- API documentation

Run from the backend directory:
    python -m uvicorn main:app --reload
============================================================
"""

import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

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

for directory in (DATABASE_DIR, LOG_DIR, UPLOAD_DIR):
    directory.mkdir(parents=True, exist_ok=True)

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass


APP_NAME = os.getenv(
    "APP_NAME",
    "AVERRA Staffing Solutions API",
)
APP_VERSION = os.getenv("APP_VERSION", "3.0.0")
APP_ENV = os.getenv("APP_ENV", "development").lower()
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

if APP_ENV == "production":
    DEBUG = False


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DEFAULT_DATABASE_URL = (
    f"sqlite:///{(DATABASE_DIR / 'averra.db').as_posix()}"
)

database_url = os.getenv("DATABASE_URL", "").strip()

if not database_url:
    database_url = DEFAULT_DATABASE_URL

elif database_url.startswith("sqlite:///") and not database_url.startswith(
    "sqlite:////"
):
    sqlite_path = database_url[len("sqlite:///"):]
    path_object = Path(sqlite_path)

    if not path_object.is_absolute():
        path_object = (BASE_DIR / path_object).resolve()

    database_url = f"sqlite:///{path_object.as_posix()}"

# Ensure the shared database connection uses the same URL.
os.environ["DATABASE_URL"] = database_url


# ============================================================
# APPLICATION IMPORTS
# ============================================================

from database.connection import (  # noqa: E402
    DATABASE_URL,
    SessionLocal,
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

logging.basicConfig(
    level=getattr(
        logging,
        os.getenv("LOG_LEVEL", "INFO").upper(),
        logging.INFO,
    ),
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
# DATABASE COMPATIBILITY
# ============================================================

def migrate_existing_database() -> None:
    """
    Add supported columns to existing SQLite tables.

    These compatibility changes do not delete existing records.
    Use versioned migrations for future schema changes.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    with engine.begin() as connection:

        if "enquiries" in tables:
            enquiry_columns = {
                column["name"]
                for column in inspect(engine).get_columns("enquiries")
            }

            if "internal_notes" not in enquiry_columns:
                connection.execute(
                    text(
                        "ALTER TABLE enquiries "
                        "ADD COLUMN internal_notes TEXT"
                    )
                )
                logger.info(
                    "Added enquiries.internal_notes"
                )

        if "jobs" in tables:
            job_columns = {
                column["name"]
                for column in inspect(engine).get_columns("jobs")
            }

            if "closing_date" not in job_columns:
                connection.execute(
                    text(
                        "ALTER TABLE jobs "
                        "ADD COLUMN closing_date DATETIME"
                    )
                )
                logger.info(
                    "Added jobs.closing_date"
                )


def initialise_database() -> None:
    """Create missing tables and apply compatibility changes."""
    # The models must be imported before create_tables().
    Base.metadata

    create_tables()
    migrate_existing_database()

    logger.info(
        "Database initialised using %s",
        DATABASE_URL,
    )


def utc_now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


# ============================================================
# APPLICATION LIFECYCLE
# ============================================================

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialise application resources at startup."""
    logger.info(
        "%s starting in %s mode",
        APP_NAME,
        APP_ENV,
    )

    try:
        initialise_database()
        yield

    except Exception:
        logger.exception(
            "Application startup or runtime failure"
        )
        raise

    finally:
        logger.info("%s shutting down", APP_NAME)
        engine.dispose()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=APP_NAME,
    description=(
        "The API for AVERRA Staffing Solutions Ltd, "
        "connecting UK businesses with skilled professionals."
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
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://averrastaffing.co.uk",
    "https://www.averrastaffing.co.uk",
]

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        ",".join(DEFAULT_ORIGINS),
    ).split(",")
    if origin.strip()
]

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
        "Content-Type",
        "X-Admin-Token",
    ],
)


# ============================================================
# GENERAL ENDPOINTS
# ============================================================

@app.get("/", tags=["General"])
def home():
    """Return basic API information."""
    return {
        "name": APP_NAME,
        "company": "AVERRA Staffing Solutions Ltd",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "status": "running",
        "documentation": "/docs",
        "health_check": "/api/health",
        "jobs_endpoint": "/api/jobs",
        "enquiries_endpoint": "/api/enquiries",
        "admin_jobs_endpoint": "/api/admin/jobs",
    }


@app.get("/api/health", tags=["General"])
def health_check():
    """Check that the API can reach its configured database."""
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
        )


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
    """Save a public website contact enquiry."""
    enquiry = Enquiry(
        name=enquiry_data.name,
        email=str(enquiry_data.email).lower(),
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

        logger.info(
            "Contact enquiry received: id=%s",
            enquiry.id,
        )

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
        )


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
    """
    Return published vacancies only.

    Draft and closed vacancies are not publicly listed.
    """
    try:
        statement = (
            select(Job)
            .where(Job.status == "published")
            .order_by(
                Job.created_at.desc(),
                Job.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        return db.scalars(statement).all()

    except SQLAlchemyError:
        logger.exception("Could not retrieve published jobs")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve vacancies.",
        )


@app.get(
    "/api/jobs/{job_id}",
    response_model=JobResponse,
    tags=["Jobs"],
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Return one published vacancy by its ID."""
    try:
        statement = select(Job).where(
            Job.id == job_id,
            Job.status == "published",
        )

        job = db.scalars(statement).first()

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve vacancy id=%s",
            job_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve this vacancy.",
        )

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
    """
    Require a private token for administrative job operations.

    The token must be configured in the backend .env file.
    """
    expected_token = os.getenv(
        "AVERRA_ADMIN_TOKEN",
        "",
    ).strip()

    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Administrator authentication is not configured."
            ),
        )

    if not x_admin_token or not secrets.compare_digest(
        x_admin_token,
        expected_token,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing administrator token.",
        )


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
    """
    Create a job vacancy.

    Set status to draft to save it without publishing.
    Set status to published to make it publicly visible.
    """
    job = Job(**job_data.model_dump())

    try:
        db.add(job)
        db.commit()
        db.refresh(job)

        logger.info(
            "Administrator created job id=%s",
            job.id,
        )

        return job

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not create job vacancy")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the job vacancy.",
        )


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
    db: Session = Depends(get_db),
):
    """
    List every vacancy, including drafts and closed jobs.

    Requires administrator authentication.
    """
    try:
        statement = select(Job).order_by(
            Job.created_at.desc(),
            Job.id.desc(),
        )

        return db.scalars(statement).all()

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve administrator job list"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve job vacancies.",
        )


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
    """
    Partially update a vacancy.

    Examples:
        {"status": "published"}
        {"status": "closed"}
        {"title": "Senior Accountant"}
    """
    try:
        job = db.get(Job, job_id)

        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job vacancy not found.",
            )

        updates = job_data.model_dump(
            exclude_unset=True,
        )

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provide at least one field to update.",
            )

        for field, value in updates.items():
            setattr(job, field, value)

        # Refresh the modification timestamp.
        job.updated_at = utc_now()

        db.commit()
        db.refresh(job)

        logger.info(
            "Administrator updated job id=%s",
            job.id,
        )

        return job

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not update job id=%s",
            job_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the job vacancy.",
        )


# ============================================================
# STARTUP
# ============================================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=APP_ENV == "development",
    )