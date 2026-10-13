
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/routes/enquiries.py

Customer enquiry API routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.enquiry import Enquiry
from app.schemas.enquiry import EnquiryCreate, EnquiryResponse

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
):
    """
    Save an enquiry submitted through the public contact form.
    """

    enquiry = Enquiry(
        name=enquiry_data.name,
        email=str(enquiry_data.email),
        phone=enquiry_data.phone,
        company=enquiry_data.company,
        subject=enquiry_data.subject,
        message=enquiry_data.message,
        status="new",
    )

    db.add(enquiry)

    try:
        db.commit()
        db.refresh(enquiry)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save your enquiry. Please try again.",
        )

    return enquiry


@router.get(
    "",
    response_model=list[EnquiryResponse],
)
def list_enquiries(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    List enquiries for the administration dashboard.

    IMPORTANT:
    Add authentication and administrator authorisation before
    including this endpoint in a production application.
    """

    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip must be zero or greater.",
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100.",
        )

    statement = (
        select(Enquiry)
        .order_by(Enquiry.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return db.scalars(statement).all()
