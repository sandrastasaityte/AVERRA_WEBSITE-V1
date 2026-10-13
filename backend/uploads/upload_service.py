
"""
AVERRA STAFFING SOLUTIONS LTD
File: app/services/upload_service.py

Secure foundation for handling uploaded staffing documents.

Security features:
- File-size limits
- Extension allowlist
- Random server-generated filenames
- File-content checks for supported document formats
- No use of the original filename as a storage path

Note:
This service does not expose a public upload endpoint.
Add authentication, authorization, malware scanning and
retention controls before accepting real candidate documents.
"""

import logging
import os
import re
import uuid
from pathlib import Path
from typing import BinaryIO

logger = logging.getLogger("averra.uploads")

BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Start with formats commonly used for CVs.
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
}

# Expected file signatures for basic format verification.
PDF_SIGNATURE = b"%PDF-"
ZIP_SIGNATURES = (
    b"PK\x03\x04",
    b"PK\x05\x06",
    b"PK\x07\x08",
)


class UploadValidationError(ValueError):
    """Raised when an uploaded file fails validation."""


def ensure_upload_directory() -> Path:
    """Create the upload directory if it does not exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def validate_original_filename(filename: str) -> str:
    """
    Validate a filename and return its lowercase extension.

    The original filename is never used as the saved path.
    """
    if not filename or not filename.strip():
        raise UploadValidationError("A filename is required.")

    if len(filename) > 255:
        raise UploadValidationError("The filename is too long.")

    if "\x00" in filename:
        raise UploadValidationError("The filename is invalid.")

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(
            "Unsupported file type. Upload a PDF or DOCX file."
        )

    return extension


def validate_file_content(
    file_obj: BinaryIO,
    extension: str,
) -> None:
    """
    Check basic file signatures.

    This is not malware scanning and cannot prove that a file
    is safe or that a DOCX archive contains valid document data.
    """
    original_position = file_obj.tell()

    try:
        file_obj.seek(0)
        signature = file_obj.read(8)

        if extension == ".pdf":
            if not signature.startswith(PDF_SIGNATURE):
                raise UploadValidationError(
                    "The file does not appear to be a valid PDF."
                )

        elif extension == ".docx":
            if not any(
                signature.startswith(item)
                for item in ZIP_SIGNATURES
            ):
                raise UploadValidationError(
                    "The file does not appear to be a DOCX archive."
                )

    finally:
        file_obj.seek(original_position)


def save_uploaded_file(
    file_obj: BinaryIO,
    original_filename: str,
) -> dict:
    """
    Validate and save an uploaded file.

    Args:
        file_obj: A binary file-like object.
        original_filename: The name supplied by the uploader.

    Returns:
        A dictionary containing the generated file ID,
        stored filename, size and extension.

    The caller must enforce authentication and authorization.
    """
    extension = validate_original_filename(original_filename)
    ensure_upload_directory()

    file_id = uuid.uuid4().hex
    stored_filename = f"{file_id}{extension}"
    destination = UPLOAD_DIR / stored_filename

    total_size = 0

    try:
        file_obj.seek(0)

        # Read the file into a temporary destination, enforcing
        # the size limit while copying.
        with destination.open("xb") as output:
            while True:
                chunk = file_obj.read(64 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise UploadValidationError(
                        "The file exceeds the 5 MB size limit."
                    )

                output.write(chunk)

        if total_size == 0:
            raise UploadValidationError(
                "Empty files cannot be uploaded."
            )

        # Validate the saved file's basic signature.
        with destination.open("rb") as saved_file:
            validate_file_content(saved_file, extension)

        logger.info(
            "Upload saved: file_id=%s extension=%s size=%s",
            file_id,
            extension,
            total_size,
        )

        return {
            "file_id": file_id,
            "stored_filename": stored_filename,
            "extension": extension,
            "size_bytes": total_size,
        }

    except Exception:
        # Avoid leaving partial or invalid files behind.
        try:
            destination.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not remove failed upload.")

        raise


def delete_uploaded_file(stored_filename: str) -> bool:
    """
    Delete a stored file using its generated filename.

    This function deliberately rejects path separators and
    filenames that do not match the generated naming pattern.
    """
    if not re.fullmatch(
        r"[0-9a-f]{32}\.(pdf|docx)",
        stored_filename or "",
    ):
        raise UploadValidationError(
            "Invalid stored filename."
        )

    destination = UPLOAD_DIR / stored_filename

    try:
        destination.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError as exc:
        raise UploadValidationError(
            "Invalid storage path."
        ) from exc

    if not destination.is_file():
        return False

    destination.unlink()

    logger.info(
        "Upload deleted: stored_filename=%s",
        stored_filename,
    )

    return True
