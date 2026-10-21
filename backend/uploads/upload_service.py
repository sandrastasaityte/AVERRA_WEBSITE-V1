
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/services/upload_service.py

Foundation for handling uploaded staffing documents.

Security measures:
- PDF and DOCX extension allowlist
- Streaming file-size enforcement
- Server-generated storage filenames
- Basic PDF signature validation
- DOCX ZIP structure and size validation
- Temporary-file cleanup on failure
- Safe deletion using generated filenames

Before public use, implement authentication, authorization,
malware scanning, private storage, and retention controls.
"""

import logging
import re
import uuid
import zipfile
from pathlib import Path
from typing import BinaryIO

logger = logging.getLogger("averra.uploads")


# ============================================================
# CONFIGURATION
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
CHUNK_SIZE = 64 * 1024  # 64 KB

# Limits applied when inspecting DOCX ZIP archives.
MAX_DOCX_MEMBERS = 2_000
MAX_DOCX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
PDF_SIGNATURE = b"%PDF-"

DOCX_REQUIRED_MEMBERS = {
    "[Content_Types].xml",
    "word/document.xml",
}

GENERATED_FILENAME_PATTERN = re.compile(
    r"[0-9a-f]{32}\.(?:pdf|docx)"
)


# ============================================================
# EXCEPTIONS
# ============================================================

class UploadValidationError(ValueError):
    """Raised when an uploaded file fails validation."""


# ============================================================
# STORAGE DIRECTORY
# ============================================================

def ensure_upload_directory() -> Path:
    """Create and return the upload storage directory."""

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


# ============================================================
# FILENAME VALIDATION
# ============================================================

def validate_original_filename(filename: str) -> str:
    """
    Validate the supplied filename and return its lowercase
    extension.

    The original filename is never used as a storage path.
    """

    if not isinstance(filename, str) or not filename.strip():
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


# ============================================================
# FILE CONTENT VALIDATION
# ============================================================

def _validate_docx_archive(file_obj: BinaryIO) -> None:
    """
    Inspect a DOCX ZIP archive without extracting its contents.

    This provides basic structural checks, not malware detection.
    """

    try:
        with zipfile.ZipFile(file_obj, "r") as archive:
            members = archive.infolist()

            if len(members) > MAX_DOCX_MEMBERS:
                raise UploadValidationError(
                    "The DOCX archive contains too many files."
                )

            member_names = {member.filename for member in members}

            if not DOCX_REQUIRED_MEMBERS.issubset(member_names):
                raise UploadValidationError(
                    "The archive does not contain the required "
                    "Word document files."
                )

            total_uncompressed_size = 0

            for member in members:
                if member.flag_bits & 0x1:
                    raise UploadValidationError(
                        "Encrypted DOCX files are not supported."
                    )

                if member.file_size < 0 or member.compress_size < 0:
                    raise UploadValidationError(
                        "The DOCX archive contains invalid file sizes."
                    )

                total_uncompressed_size += member.file_size

                if (
                    total_uncompressed_size
                    > MAX_DOCX_UNCOMPRESSED_SIZE
                ):
                    raise UploadValidationError(
                        "The DOCX archive expands beyond the "
                        "permitted size."
                    )

            # Check archive integrity without extracting files.
            bad_member = archive.testzip()

            if bad_member is not None:
                raise UploadValidationError(
                    "The DOCX archive contains a damaged file."
                )

    except UploadValidationError:
        raise

    except zipfile.BadZipFile as exc:
        raise UploadValidationError(
            "The file is not a readable DOCX archive."
        ) from exc

    except (OSError, RuntimeError, EOFError, zipfile.LargeZipFile) as exc:
        raise UploadValidationError(
            "The DOCX archive could not be inspected."
        ) from exc


def validate_file_content(
    file_obj: BinaryIO,
    extension: str,
) -> None:
    """
    Perform basic content checks for supported file types.

    PDF:
        Checks for a PDF signature at the beginning of the file.

    DOCX:
        Checks ZIP structure, required Word document members,
        archive integrity, and uncompressed size.

    These checks do not establish that a file is trustworthy
    or free from malware.
    """

    if extension not in ALLOWED_EXTENSIONS:
        raise UploadValidationError("Unsupported file type.")

    try:
        original_position = file_obj.tell()
        file_obj.seek(0)
    except (AttributeError, OSError, ValueError) as exc:
        raise UploadValidationError(
            "The uploaded file must support reading and seeking."
        ) from exc

    try:
        signature = file_obj.read(8)

        if not isinstance(signature, bytes):
            raise UploadValidationError(
                "The uploaded file must be binary."
            )

        if extension == ".pdf":
            if not signature.startswith(PDF_SIGNATURE):
                raise UploadValidationError(
                    "The file does not appear to be a valid PDF."
                )

        elif extension == ".docx":
            if not signature.startswith(b"PK"):
                raise UploadValidationError(
                    "The file does not appear to be a DOCX archive."
                )

            file_obj.seek(0)
            _validate_docx_archive(file_obj)

    except UploadValidationError:
        raise

    except (OSError, ValueError) as exc:
        raise UploadValidationError(
            "The uploaded file could not be inspected."
        ) from exc

    finally:
        file_obj.seek(original_position)


# ============================================================
# SAVE UPLOADED FILE
# ============================================================

def save_uploaded_file(
    file_obj: BinaryIO,
    original_filename: str,
) -> dict:
    """
    Validate and save an uploaded document.

    Returns a dictionary containing:
        file_id
        stored_filename
        extension
        size_bytes

    The caller remains responsible for authentication,
    authorization, malware scanning, and access control.
    """

    extension = validate_original_filename(original_filename)

    try:
        original_position = file_obj.tell()
        file_obj.seek(0)
    except (AttributeError, OSError, ValueError) as exc:
        raise UploadValidationError(
            "The uploaded file must support reading and seeking."
        ) from exc

    upload_directory = ensure_upload_directory()

    file_id = uuid.uuid4().hex
    stored_filename = f"{file_id}{extension}"

    temporary_path = upload_directory / f".{file_id}.upload"
    destination = upload_directory / stored_filename

    total_size = 0

    try:
        with temporary_path.open("xb") as output:
            while True:
                chunk = file_obj.read(CHUNK_SIZE)

                if not chunk:
                    break

                if not isinstance(chunk, bytes):
                    raise UploadValidationError(
                        "The uploaded file must be binary."
                    )

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

        # Validate the actual bytes written to disk.
        with temporary_path.open("rb") as saved_file:
            validate_file_content(saved_file, extension)

        # Publish the file only after validation succeeds.
        temporary_path.replace(destination)

        logger.info(
            "Upload saved: file_id=%s extension=%s size_bytes=%s",
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
        # Remove partial files if any operation fails.
        for path in (temporary_path, destination):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception(
                    "Could not remove failed upload file."
                )

        raise

    finally:
        try:
            file_obj.seek(original_position)
        except (AttributeError, OSError, ValueError):
            logger.warning(
                "Could not restore the uploaded file position."
            )


# ============================================================
# DELETE UPLOADED FILE
# ============================================================

def delete_uploaded_file(stored_filename: str) -> bool:
    """
    Delete a stored file using its generated filename.

    Returns True if the file was deleted, or False if it
    does not exist.

    Invalid filenames raise UploadValidationError.
    """

    if (
        not isinstance(stored_filename, str)
        or not GENERATED_FILENAME_PATTERN.fullmatch(stored_filename)
    ):
        raise UploadValidationError("Invalid stored filename.")

    upload_directory = ensure_upload_directory()
    destination = upload_directory / stored_filename

    # Confirm the storage directory itself resolves as expected.
    try:
        resolved_directory = upload_directory.resolve()
        resolved_destination = destination.resolve(strict=False)

        resolved_destination.relative_to(resolved_directory)

    except (ValueError, OSError, RuntimeError) as exc:
        raise UploadValidationError(
            "Invalid storage path."
        ) from exc

    # Do not follow symlinks when deleting files.
    if destination.is_symlink():
        raise UploadValidationError(
            "Symbolic links are not valid uploaded files."
        )

    if not destination.is_file():
        return False

    try:
        destination.unlink()
    except OSError:
        logger.exception(
            "Could not delete uploaded file: file_id=%s",
            stored_filename.split(".", 1)[0],
        )
        raise

    logger.info(
        "Upload deleted: file_id=%s",
        stored_filename.split(".", 1)[0],
    )

    return True
