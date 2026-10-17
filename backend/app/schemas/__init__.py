
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/schemas/__init__.py

Central exports for API request and response schemas.
"""

from .enquiry import (
    EnquiryCreate,
    EnquiryResponse,
    EnquiryDetail,
    EnquiryStatusUpdate,
)

from .jobs import (
    JobBase,
    JobCreate,
    JobUpdate,
    JobResponse,
    JobAdminResponse,
)

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
]
