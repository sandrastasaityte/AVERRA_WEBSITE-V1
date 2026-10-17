
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/enquiries.py

Customer enquiry API routes.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.enquiry import Enquiry
from app.schemas.enquiry import EnquiryCreate, EnquiryResponse


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/enquiries",
    tags=["Enquiries"],
)


@router.post(
    "",
    response_model=EnquiryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_enquiry(
    enquiry_data: EnquiryCreate,
    db: Session = Depends(get_db),
) -> Enquiry:
    """Save an enquiry submitted through the public contact form."""

    enquiry = Enquiry(
        name=enquiry_data.name,
        email=str(enquiry_data.email),
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

        # Record the technical error privately; do not expose database
        # details to website visitors.
        logger.exception("Failed to save a customer enquiry.")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save your enquiry. Please try again.",
        ) from None

    return enquiry
