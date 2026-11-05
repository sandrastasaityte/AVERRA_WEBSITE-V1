
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/services/email.py
Version: 1.1.0

Reusable Gmail SMTP email service.

Required environment variables:
    SMTP_HOST
    SMTP_PORT
    SMTP_USERNAME
    SMTP_PASSWORD
    SMTP_FROM_EMAIL

Optional:
    SMTP_TO_EMAIL
    SMTP_TIMEOUT
    SMTP_USE_TLS
"""

import logging
import os
import smtplib
import ssl

from email.message import EmailMessage
from typing import Iterable

logger = logging.getLogger(__name__)


def _get_setting(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _smtp_settings() -> dict:
    host = _get_setting("SMTP_HOST", "smtp.gmail.com")
    port_text = _get_setting("SMTP_PORT", "587")
    username = _get_setting("SMTP_USERNAME")
    password = _get_setting("SMTP_PASSWORD")
    from_email = _get_setting("SMTP_FROM_EMAIL", username)
    to_email = _get_setting("SMTP_TO_EMAIL", from_email)
    timeout_text = _get_setting("SMTP_TIMEOUT", "20")
    use_tls_text = _get_setting("SMTP_USE_TLS", "true").lower()

    if not username or not password or not from_email or not to_email:
        raise RuntimeError(
            "Email configuration is incomplete. Check SMTP_USERNAME, "
            "SMTP_PASSWORD, SMTP_FROM_EMAIL, and SMTP_TO_EMAIL."
        )

    try:
        port = int(port_text)
        timeout = float(timeout_text)
    except ValueError as exc:
        raise RuntimeError(
            "SMTP_PORT or SMTP_TIMEOUT is invalid."
        ) from exc

    if not 1 <= port <= 65535:
        raise RuntimeError("SMTP_PORT must be between 1 and 65535.")

    if timeout <= 0:
        raise RuntimeError("SMTP_TIMEOUT must be greater than zero.")

    if use_tls_text not in {"true", "false", "1", "0", "yes", "no"}:
        raise RuntimeError("SMTP_USE_TLS must be true or false.")

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "to_email": to_email,
        "timeout": timeout,
        "use_tls": use_tls_text in {"true", "1", "yes"},
    }


def send_email(
    *,
    subject: str,
    body: str,
    to: str | Iterable[str] | None = None,
    reply_to: str | None = None,
) -> bool:
    """Send a plain-text email using SMTP."""

    settings = _smtp_settings()

    if isinstance(to, str):
        recipients = [to.strip()]
    elif to is None:
        recipients = [settings["to_email"]]
    else:
        recipients = [
            address.strip()
            for address in to
            if address.strip()
        ]

    if not recipients:
        raise ValueError("At least one email recipient is required.")

    message = EmailMessage()
    message["Subject"] = subject.strip() or "AVERRA notification"
    message["From"] = settings["from_email"]
    message["To"] = ", ".join(recipients)

    if reply_to:
        message["Reply-To"] = reply_to.strip()

    message.set_content(body)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(
            settings["host"],
            settings["port"],
            timeout=settings["timeout"],
        ) as smtp:
            smtp.ehlo()

            if settings["use_tls"]:
                smtp.starttls(context=context)
                smtp.ehlo()

            smtp.login(
                settings["username"],
                settings["password"],
            )

            smtp.send_message(message)

        logger.info("Email sent successfully.")
        return True

    except (smtplib.SMTPException, OSError):
        logger.exception("SMTP email delivery failed.")
        raise


def send_enquiry_notification(
    *,
    enquiry_id: int,
    name: str,
    email: str,
    phone: str | None,
    company: str | None,
    subject: str | None,
    message: str,
) -> bool:
    """Notify AVERRA when a website enquiry is submitted."""

    email_subject = (
        f"AVERRA website enquiry #{enquiry_id}: "
        f"{subject or 'New enquiry'}"
    )

    body = (
        "A new customer enquiry was submitted through the AVERRA website.\n\n"
        f"Enquiry ID: {enquiry_id}\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Phone: {phone or 'Not provided'}\n"
        f"Company: {company or 'Not provided'}\n"
        f"Subject: {subject or 'Not provided'}\n\n"
        "Message:\n"
        f"{message}\n"
    )

    return send_email(
        subject=email_subject,
        body=body,
        reply_to=email,
    )


def send_application_notification(
    *,
    application_id: int,
    full_name: str,
    email: str,
    phone: str | None,
    job_title: str,
) -> bool:
    """Notify AVERRA when a job application is submitted."""

    email_subject = (
        f"AVERRA job application #{application_id}: {job_title}"
    )

    body = (
        "A new job application was submitted through the AVERRA website.\n\n"
        f"Application ID: {application_id}\n"
        f"Applicant: {full_name}\n"
        f"Email: {email}\n"
        f"Phone: {phone or 'Not provided'}\n"
        f"Job title: {job_title}\n\n"
        "The CV is stored in the AVERRA application database/admin system. "
        "This notification does not include the CV as an attachment.\n"
    )

    return send_email(
        subject=email_subject,
        body=body,
        reply_to=email,
    )
