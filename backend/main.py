
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/main.py
Version: 4.5.0

FastAPI application for the AVERRA website.
"""

from __future__ import annotations

import logging
import mimetypes
import os
import secrets
import smtplib
import ssl

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import inspect, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


# ============================================================
# PATHS AND ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATABASE_DIR = BASE_DIR / "database"
LOG_DIR = BASE_DIR / "logs"
UPLOAD_DIR = BASE_DIR / "uploads"

load_dotenv(BASE_DIR / ".env", override=False)

for directory in (DATABASE_DIR, LOG_DIR, UPLOAD_DIR):
    directory.mkdir(parents=True, exist_ok=True)

APP_NAME = os.getenv(
    "APP_NAME",
    "AVERRA Staffing Solutions API",
).strip()

APP_VERSION = "4.5.0"

APP_ENV = os.getenv(
    "APP_ENV",
    "production" if os.getenv("RENDER") else "development",
).strip().lower()

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

from database.connection import (
    create_tables,
    engine,
    get_db,
)

from app.models import Base, Enquiry, Job, Application

from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryResponse,
)

from app.schemas.jobs import (
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
# TIME HELPERS
# ============================================================

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.isoformat()


def is_job_expired(job: Job) -> bool:
    if not job.closing_date:
        return False

    closing_date = job.closing_date

    if closing_date.tzinfo is None:
        closing_date = closing_date.replace(tzinfo=timezone.utc)

    return closing_date < utc_now()


# ============================================================
# GMAIL SMTP CONFIGURATION
# ============================================================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()

try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587").strip())
except ValueError:
    SMTP_PORT = 587

SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()

SMTP_FROM_EMAIL = os.getenv(
    "SMTP_FROM_EMAIL",
    SMTP_USERNAME or COMPANY_EMAIL,
).strip()

SMTP_TIMEOUT = 20


def send_email(message: EmailMessage) -> bool:
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("Email not sent: SMTP credentials are missing.")
        return False

    try:
        tls_context = ssl.create_default_context()

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT,
        ) as server:
            server.ehlo()
            server.starttls(context=tls_context)
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)

        return True

    except Exception:
        logger.exception("SMTP email delivery failed.")
        return False


def send_enquiry_notification(enquiry: Enquiry) -> bool:
    message = EmailMessage()

    message["Subject"] = (
        f"New website enquiry - {enquiry.name or 'Website visitor'}"
    )
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = COMPANY_EMAIL

    message.set_content(
        f"""
A new contact enquiry has been submitted through the AVERRA website.

Company: {COMPANY_NAME}
Enquiry ID: {enquiry.id}
Received: {iso_datetime(enquiry.created_at)}

Name: {enquiry.name or "Not provided"}
Email: {enquiry.email or "Not provided"}
Phone: {enquiry.phone or "Not provided"}
Company: {enquiry.company or "Not provided"}
Subject: {enquiry.subject or "Not provided"}

Message:
{enquiry.message or "No message provided"}

Website: {COMPANY_WEBSITE}
""".strip()
    )

    sent = send_email(message)

    if sent:
        logger.info("Enquiry notification sent: id=%s", enquiry.id)
    else:
        logger.warning("Enquiry notification failed: id=%s", enquiry.id)

    return sent


# ============================================================
# DATABASE INITIALISATION
# ============================================================

def migrate_existing_database() -> None:
    """
    Apply only the existing additive SQLite column migrations.

    This function does not delete or replace existing records.
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
    _ = Base.metadata

    create_tables()
    migrate_existing_database()

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    logger.info("Database initialised successfully")


# ============================================================
# APPLICATION LIFECYCLE
# ============================================================

@asynccontextmanager
async def lifespan(application: FastAPI):
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
# CORS
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
    "https://averrawebsite-v1-frontend-9ha2.vercel.app",
    "https://averra-admin-smoky.vercel.app",
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

if APP_ENV != "production":
    allowed_origins.extend([
        "http://localhost:63342",
        "http://127.0.0.1:63342",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ])

allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
        "admin_enquiries_endpoint": "/api/admin/enquiries",
        "admin_applications_endpoint": "/api/admin/applications",
    }


@app.get("/api/health", tags=["General"])
def health_check() -> dict[str, str]:
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

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not save contact enquiry")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save your enquiry. Please try again later.",
        ) from None

    logger.info("Contact enquiry saved: id=%s", enquiry.id)
    send_enquiry_notification(enquiry)

    return enquiry


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
    """Return published vacancies that have not passed their closing date."""

    try:
        statement = (
            select(Job)
            .where(
                Job.status == "published",
                or_(
                    Job.closing_date.is_(None),
                    Job.closing_date >= utc_now(),
                ),
            )
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
    try:
        job = db.scalars(
            select(Job).where(
                Job.id == job_id,
                Job.status == "published",
            )
        ).first()

    except SQLAlchemyError:
        logger.exception("Could not retrieve vacancy id=%s", job_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve this vacancy.",
        ) from None

    if job is None or is_job_expired(job):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found.",
        )

    return job


# ============================================================
# PUBLIC JOB APPLICATIONS
# ============================================================

MAX_CV_BYTES = 5 * 1024 * 1024

ALLOWED_CV_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
}

PDF_SIGNATURE = b"%PDF-"
DOC_SIGNATURE = bytes.fromhex("D0 CF 11 E0 A1 B1 1A E1")
DOCX_SIGNATURE = b"PK"


def send_application_notification(application: Application) -> bool:
    """Notify AVERRA that an application has been received.

    The CV itself is deliberately not attached to the email.
    """

    message = EmailMessage()

    message["Subject"] = (
        f"New job application - {application.job_title} "
        f"(Application #{application.id})"
    )
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = COMPANY_EMAIL

    message.set_content(
        f"""
A new application has been submitted through the AVERRA website.

Company: {COMPANY_NAME}
Application reference: {application.id}
Received: {iso_datetime(application.created_at)}

Applicant: {application.full_name}
Email: {application.email}
Phone: {application.phone or "Not provided"}
Vacancy: {application.job_title}
Job ID: {application.job_id if application.job_id is not None else "General application"}
CV filename: {application.cv_original_name}
CV size: {application.cv_size} bytes
Privacy consent: {"Yes" if application.privacy_consent else "No"}
Application status: {application.status}

The CV is stored in the application database. The notification email
does not contain the CV attachment.

Website: {COMPANY_WEBSITE}
""".strip()
    )

    sent = send_email(message)

    if sent:
        logger.info(
            "Application notification email sent: id=%s",
            application.id,
        )
    else:
        logger.warning(
            "Application notification email failed: id=%s",
            application.id,
        )

    return sent


def _valid_cv_signature(extension: str, content: bytes) -> bool:
    if extension == ".pdf":
        return content.startswith(PDF_SIGNATURE)

    if extension == ".doc":
        return content.startswith(DOC_SIGNATURE)

    if extension == ".docx":
        return content.startswith(DOCX_SIGNATURE)

    return False


@app.post(
    "/api/applications",
    status_code=status.HTTP_201_CREATED,
    tags=["Applications"],
)
async def create_application(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(default=""),
    job_id: str = Form(default=""),
    job_title: str = Form(default="General Application"),
    cover_letter: str = Form(default=""),
    privacy_consent: str = Form(...),
    cv: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:

    full_name = full_name.strip()
    email = email.strip().lower()
    phone = phone.strip()
    cover_letter = cover_letter.strip()

    if not full_name or len(full_name) > 150:
        raise HTTPException(
            status_code=422,
            detail="Please provide a name of no more than 150 characters.",
        )

    if (
        len(email) > 254
        or not email
        or "@" not in email
        or email.startswith("@")
        or email.endswith("@")
        or any(character.isspace() for character in email)
    ):
        raise HTTPException(
            status_code=422,
            detail="Please provide a valid email address.",
        )

    if len(phone) > 50:
        raise HTTPException(
            status_code=422,
            detail="Phone number must be 50 characters or fewer.",
        )

    if len(cover_letter) > 10000:
        raise HTTPException(
            status_code=422,
            detail="Cover letter must be 10,000 characters or fewer.",
        )

    if privacy_consent.strip().lower() not in {
        "true", "1", "yes", "on"
    }:
        raise HTTPException(
            status_code=422,
            detail="Privacy consent is required to submit an application.",
        )

    original_name = Path(cv.filename or "").name.strip()

    if not original_name or len(original_name) > 255:
        raise HTTPException(
            status_code=422,
            detail="Please upload a CV with a valid filename.",
        )

    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_CV_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="CV must be a PDF, DOC or DOCX file.",
        )

    try:
        cv_content = await cv.read(MAX_CV_BYTES + 1)
    finally:
        await cv.close()

    if not cv_content:
        raise HTTPException(
            status_code=422,
            detail="The uploaded CV file is empty.",
        )

    if len(cv_content) > MAX_CV_BYTES:
        raise HTTPException(
            status_code=413,
            detail="CV must be no larger than 5 MB.",
        )

    if not _valid_cv_signature(extension, cv_content):
        raise HTTPException(
            status_code=415,
            detail="The uploaded file content does not match a supported CV format.",
        )

    selected_job: Job | None = None
    parsed_job_id: int | None = None

    if job_id.strip() and job_id.strip().lower() != "general":

        try:
            parsed_job_id = int(job_id.strip())
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="The selected vacancy is invalid. Please select it again.",
            ) from None

        if parsed_job_id <= 0:
            raise HTTPException(
                status_code=422,
                detail="The selected vacancy is invalid.",
            )

        try:
            selected_job = db.scalars(
                select(Job).where(
                    Job.id == parsed_job_id,
                    Job.status == "published",
                )
            ).first()

        except SQLAlchemyError:
            logger.exception(
                "Could not verify selected job id=%s",
                parsed_job_id,
            )
            raise HTTPException(
                status_code=500,
                detail="Unable to verify the selected vacancy. Please try again.",
            ) from None

        if selected_job is None or is_job_expired(selected_job):
            raise HTTPException(
                status_code=422,
                detail="The selected vacancy is no longer available.",
            )

    authoritative_job_title = (
        selected_job.title if selected_job else "General Application"
    )

    application = Application(
        full_name=full_name,
        email=email,
        phone=phone or None,
        job_id=selected_job.id if selected_job else None,
        job_title=authoritative_job_title,
        cover_letter=cover_letter or None,
        cv_original_name=original_name,
        cv_size=len(cv_content),
        cv_content=cv_content,
        privacy_consent=True,
        status="new",
        email_status="pending",
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not save job application")
        raise HTTPException(
            status_code=500,
            detail="Unable to save your application. Please try again later.",
        ) from None

    notification_sent = send_application_notification(application)

    try:
        application.email_status = (
            "sent" if notification_sent else "failed"
        )
        db.commit()

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not update application email status: id=%s",
            application.id,
        )
        notification_sent = False

    logger.info(
        "Job application saved: id=%s job_id=%s notification_sent=%s",
        application.id,
        application.job_id,
        notification_sent,
    )

    return {
        "success": True,
        "application_id": application.id,
        "message": "Your application has been received.",
        "notification_sent": notification_sent,
        "email_status": "sent" if notification_sent else "failed",
    }


# ============================================================
# ADMINISTRATOR AUTHENTICATION
# ============================================================

def require_admin(
    x_admin_token: str | None = Header(
        default=None,
        alias="X-Admin-Token",
    ),
) -> None:

    expected_token = os.getenv("AVERRA_ADMIN_TOKEN", "").strip()

    is_placeholder = (
        expected_token.startswith("REPLACE_WITH_")
        or expected_token == "replace_with_your_own_long_random_secret"
    )

    if not expected_token or is_placeholder:
        logger.error(
            "Admin token configuration invalid: present=%s placeholder=%s length=%s",
            bool(expected_token),
            is_placeholder,
            len(expected_token),
        )

        raise HTTPException(
            status_code=503,
            detail="Administrator authentication is not configured.",
        )

    if (
        not x_admin_token
        or not secrets.compare_digest(x_admin_token, expected_token)
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing administrator token.",
        )


# ============================================================
# ADMIN ENQUIRY STATUS COMPATIBILITY
# ============================================================

ENQUIRY_STATUS_MAP = {
    "new": "new",
    "unread": "new",
    "contacted": "in_progress",
    "in_progress": "in_progress",
    "replied": "responded",
    "responded": "responded",
    "resolved": "closed",
    "closed": "closed",
    "spam": "spam",
}

VALID_ENQUIRY_DATABASE_STATUSES = {
    "new",
    "in_progress",
    "responded",
    "closed",
    "spam",
}


def canonical_enquiry_status(value: str) -> str:
    normalized = value.strip().lower()

    try:
        result = ENQUIRY_STATUS_MAP[normalized]
    except KeyError:
        raise HTTPException(
            status_code=422,
            detail="Invalid enquiry status.",
        ) from None

    if result not in VALID_ENQUIRY_DATABASE_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Invalid enquiry status.",
        )

    return result


class EnquiryStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    internal_notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()

        if value not in ENQUIRY_STATUS_MAP:
            raise ValueError("Invalid enquiry status.")

        return value

    @field_validator("internal_notes")
    @classmethod
    def validate_internal_notes(
        cls,
        value: str | None,
    ) -> str | None:
        if value is not None:
            value = value.strip()

            if len(value) > 10000:
                raise ValueError(
                    "Internal notes must be 10,000 characters or fewer."
                )

        return value


def enquiry_to_admin_dict(item: Enquiry) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "email": item.email,
        "phone": item.phone,
        "company": item.company,
        "subject": item.subject,
        "message": item.message,
        "status": item.status,
        "internal_notes": item.internal_notes,
        "created_at": iso_datetime(item.created_at),
        "updated_at": iso_datetime(item.updated_at),
    }


# ============================================================
# ADMIN: LIST ENQUIRIES
# ============================================================

@app.get(
    "/api/admin/enquiries",
    tags=["Admin - Enquiries"],
)
def list_admin_enquiries(
    _: None = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    enquiry_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):

    try:
        statement = select(Enquiry)

        if enquiry_status:
            canonical_status = canonical_enquiry_status(enquiry_status)

            statement = statement.where(
                Enquiry.status == canonical_status
            )

        statement = (
            statement
            .order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
            .offset(offset)
            .limit(limit)
        )

        enquiries = db.scalars(statement).all()

        return [
            enquiry_to_admin_dict(item)
            for item in enquiries
        ]

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception("Could not retrieve administrator enquiries")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve contact enquiries.",
        ) from None


# ============================================================
# ADMIN: UPDATE ENQUIRY STATUS AND INTERNAL NOTES
# ============================================================

@app.patch(
    "/api/admin/enquiries/{enquiry_id}",
    tags=["Admin - Enquiries"],
)
def update_admin_enquiry(
    enquiry_id: int,
    enquiry_data: EnquiryStatusUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        enquiry = db.get(Enquiry, enquiry_id)

        if enquiry is None:
            raise HTTPException(
                status_code=404,
                detail="Enquiry not found.",
            )

        enquiry.status = canonical_enquiry_status(
            enquiry_data.status
        )

        if enquiry_data.internal_notes is not None:
            enquiry.internal_notes = (
                enquiry_data.internal_notes or None
            )

        if hasattr(enquiry, "updated_at"):
            enquiry.updated_at = utc_now()

        db.commit()
        db.refresh(enquiry)

        logger.info(
            "Administrator updated enquiry id=%s status=%s",
            enquiry.id,
            enquiry.status,
        )

        return enquiry_to_admin_dict(enquiry)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not update enquiry id=%s",
            enquiry_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to update enquiry.",
        ) from None


# ============================================================
# ADMIN: DELETE ENQUIRY
# ============================================================

@app.delete(
    "/api/admin/enquiries/{enquiry_id}",
    tags=["Admin - Enquiries"],
)
def delete_admin_enquiry(
    enquiry_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        enquiry = db.get(Enquiry, enquiry_id)

        if enquiry is None:
            raise HTTPException(
                status_code=404,
                detail="Enquiry not found.",
            )

        db.delete(enquiry)
        db.commit()

        logger.warning(
            "Administrator deleted enquiry id=%s",
            enquiry_id,
        )

        return {
            "success": True,
            "message": "Enquiry deleted successfully.",
            "id": enquiry_id,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not delete enquiry id=%s",
            enquiry_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the enquiry.",
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
            status_code=500,
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
            status_code=500,
            detail="Unable to retrieve job vacancies.",
        ) from None


# ============================================================
# ADMIN: UPDATE VACANCY
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

    try:
        job = db.get(Job, job_id)

        if job is None:
            raise HTTPException(
                status_code=404,
                detail="Job vacancy not found.",
            )

        updates = job_data.model_dump(exclude_unset=True)

        if not updates:
            raise HTTPException(
                status_code=422,
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
            status_code=500,
            detail="Unable to update the job vacancy.",
        ) from None


# ============================================================
# ADMIN: DELETE VACANCY
# ============================================================

@app.delete(
    "/api/admin/jobs/{job_id}",
    tags=["Admin - Jobs"],
)
def delete_job(
    job_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        job = db.get(Job, job_id)

        if job is None:
            raise HTTPException(
                status_code=404,
                detail="Job vacancy not found.",
            )

        linked_application = db.scalars(
            select(Application.id)
            .where(Application.job_id == job_id)
            .limit(1)
        ).first()

        if linked_application is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This vacancy has applications and cannot be deleted. "
                    "Close or unpublish the vacancy to preserve application history."
                ),
            )

        db.delete(job)
        db.commit()

        logger.warning("Administrator deleted job id=%s", job_id)

        return {
            "success": True,
            "message": "Job vacancy deleted successfully.",
            "id": job_id,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not delete job id=%s", job_id)
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the job vacancy.",
        ) from None


# ============================================================
# ADMIN APPLICATION MANAGEMENT
# ============================================================

APPLICATION_STATUSES = {
    "new",
    "reviewing",
    "shortlisted",
    "rejected",
    "hired",
    "withdrawn",
}


class ApplicationStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()

        if value not in APPLICATION_STATUSES:
            raise ValueError("Invalid application status.")

        return value


def application_to_admin_dict(
    application: Application,
    include_cover_letter: bool = True,
) -> dict[str, Any]:

    result = {
        "id": application.id,
        "full_name": application.full_name,
        "email": application.email,
        "phone": application.phone,
        "job_id": application.job_id,
        "job_title": application.job_title,
        "cv_original_name": application.cv_original_name,
        "cv_size": application.cv_size,
        "privacy_consent": application.privacy_consent,
        "status": application.status,
        "email_status": application.email_status,
        "created_at": iso_datetime(application.created_at),
        "updated_at": iso_datetime(application.updated_at),
        "cv_download_url": (
            f"/api/admin/applications/{application.id}/cv"
        ),
    }

    if include_cover_letter:
        result["cover_letter"] = application.cover_letter

    return result


# ============================================================
# ADMIN: LIST APPLICATIONS
# ============================================================

@app.get(
    "/api/admin/applications",
    tags=["Admin - Applications"],
)
def list_admin_applications(
    _: None = Depends(require_admin),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    application_status: str | None = Query(
        default=None,
        alias="status",
    ),
    job_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
):

    try:
        statement = select(Application)

        if application_status:
            normalized_status = application_status.strip().lower()

            if normalized_status not in APPLICATION_STATUSES:
                raise HTTPException(
                    status_code=422,
                    detail="Invalid application status filter.",
                )

            statement = statement.where(
                Application.status == normalized_status
            )

        if job_id is not None:
            statement = statement.where(
                Application.job_id == job_id
            )

        statement = (
            statement
            .order_by(
                Application.created_at.desc(),
                Application.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        applications = db.scalars(statement).all()

        return [
            application_to_admin_dict(item)
            for item in applications
        ]

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception("Could not retrieve administrator applications")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve applications.",
        ) from None


# ============================================================
# ADMIN: GET ONE APPLICATION
# ============================================================

@app.get(
    "/api/admin/applications/{application_id}",
    tags=["Admin - Applications"],
)
def get_admin_application(
    application_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        application = db.get(Application, application_id)

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found.",
            )

        return application_to_admin_dict(application)

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Could not retrieve application id=%s",
            application_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve the application.",
        ) from None


# ============================================================
# ADMIN: UPDATE APPLICATION STATUS
# ============================================================

@app.patch(
    "/api/admin/applications/{application_id}",
    tags=["Admin - Applications"],
)
def update_admin_application(
    application_id: int,
    application_data: ApplicationStatusUpdate,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        application = db.get(Application, application_id)

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found.",
            )

        application.status = application_data.status

        if hasattr(application, "updated_at"):
            application.updated_at = utc_now()

        db.commit()
        db.refresh(application)

        logger.info(
            "Administrator updated application id=%s status=%s",
            application.id,
            application.status,
        )

        return application_to_admin_dict(application)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not update application id=%s",
            application_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to update the application.",
        ) from None


# ============================================================
# ADMIN: DOWNLOAD APPLICATION CV
# ============================================================

@app.get(
    "/api/admin/applications/{application_id}/cv",
    tags=["Admin - Applications"],
)
def download_application_cv(
    application_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        application = db.get(Application, application_id)

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found.",
            )

        cv_content = application.cv_content
        original_name = application.cv_original_name or (
            f"application-{application_id}"
        )

        if not cv_content:
            raise HTTPException(
                status_code=404,
                detail="The CV file is not available.",
            )

        safe_name = Path(original_name).name
        extension = Path(safe_name).suffix.lower()

        allowed_types = {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": (
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        }

        media_type = allowed_types.get(
            extension,
            "application/octet-stream",
        )

        ascii_name = (
            safe_name.encode("ascii", "ignore")
            .decode("ascii")
            .replace('"', "")
            .replace("\\", "_")
        )

        if not ascii_name:
            ascii_name = f"application-{application_id}{extension}"

        encoded_name = quote(safe_name, safe="")

        return Response(
            content=cv_content,
            media_type=media_type,
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{ascii_name}"; '
                    f"filename*=UTF-8''{encoded_name}"
                ),
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Could not download CV for application id=%s",
            application_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to download the CV.",
        ) from None


# ============================================================
# ADMIN: DELETE APPLICATION
# ============================================================

@app.delete(
    "/api/admin/applications/{application_id}",
    tags=["Admin - Applications"],
)
def delete_admin_application(
    application_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        application = db.get(Application, application_id)

        if application is None:
            raise HTTPException(
                status_code=404,
                detail="Application not found.",
            )

        db.delete(application)
        db.commit()

        logger.warning(
            "Administrator permanently deleted application and stored CV: id=%s",
            application_id,
        )

        return {
            "success": True,
            "message": "Application and stored CV deleted successfully.",
            "id": application_id,
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Could not delete application id=%s",
            application_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the application.",
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
