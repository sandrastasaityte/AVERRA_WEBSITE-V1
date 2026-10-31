
"""
AVERRA STAFFING SOLUTIONS LTD

File: backend/app/schemas/__init__.py

Central exports for API request and response schemas.
"""

# ------------------------------------------------------------
# ENQUIRY SCHEMAS
# ------------------------------------------------------------

from .enquiry import (
    EnquiryCreate,
    EnquiryResponse,
    EnquiryDetail,
    EnquiryStatusUpdate,
)

# ------------------------------------------------------------
# JOB SCHEMAS
# ------------------------------------------------------------

from .jobs import (
    JobBase,
    JobCreate,
    JobUpdate,
    JobResponse,
    JobAdminResponse,
)

# ------------------------------------------------------------
# APPLICATION SCHEMAS
# ------------------------------------------------------------

from .applications import (
    ApplicationStatus,
    ApplicationResponse,
    ApplicationDetail,
    ApplicationStatusUpdate,
    ApplicationListResponse,
)

# ------------------------------------------------------------
# PUBLIC EXPORTS
# ------------------------------------------------------------

__all__ = [
    # Enquiry schemas
    "EnquiryCreate",
    "EnquiryResponse",
    "EnquiryDetail",
    "EnquiryStatusUpdate",

    # Job schemas
    "JobBase",
    "JobCreate",
    "JobUpdate",
    "JobResponse",
    "JobAdminResponse",

    # Application schemas
    "ApplicationStatus",
    "ApplicationResponse",
    "ApplicationDetail",
    "ApplicationStatusUpdate",
    "ApplicationListResponse",
]
