
"""
AVERRA STAFFING SOLUTIONS LTD
File: app/logging_config.py

Configures application logging for development and production.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


# ------------------------------------------------------------
# Paths and configuration
# ------------------------------------------------------------

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
LOG_DIR = BACKEND_DIR / "logs"

LOG_LEVEL_NAME = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME, logging.INFO)

MAX_LOG_SIZE = 5 * 1024 * 1024  # 5 MB
BACKUP_COUNT = 5

LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | "
    "%(name)s | %(message)s"
)

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> logging.Logger:
    """Configure console and rotating file logging."""

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)

    # Prevent duplicate handlers when configuration is called again.
    if getattr(root_logger, "_averra_logging_configured", False):
        return logging.getLogger("averra")

    formatter = logging.Formatter(
        fmt=LOG_FORMAT,
        datefmt=DATE_FORMAT,
    )

    # Console output for the PyCharm terminal.
    console_handler = logging.StreamHandler()
    console_handler.setLevel(LOG_LEVEL)
    console_handler.setFormatter(formatter)

    # Application log with automatic rotation.
    application_handler = RotatingFileHandler(
        filename=LOG_DIR / "application.log",
        maxBytes=MAX_LOG_SIZE,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    application_handler.setLevel(LOG_LEVEL)
    application_handler.setFormatter(formatter)

    root_logger.addHandler(console_handler)
    root_logger.addHandler(application_handler)

    root_logger._averra_logging_configured = True

    logger = logging.getLogger("averra")
    logger.info("AVERRA logging configured.")

    return logger


logger = configure_logging()
