
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/app/logging_config.py

Configures application logging for development and production.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


# ============================================================
# PATHS AND CONFIGURATION
# ============================================================

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
LOG_DIR = BACKEND_DIR / "logs"

VALID_LOG_LEVELS = {
    "DEBUG",
    "INFO",
    "WARNING",
    "ERROR",
    "CRITICAL",
}

LOG_LEVEL_NAME = os.getenv("LOG_LEVEL", "INFO").upper()

if LOG_LEVEL_NAME not in VALID_LOG_LEVELS:
    LOG_LEVEL_NAME = "INFO"

LOG_LEVEL = getattr(logging, LOG_LEVEL_NAME)

MAX_LOG_SIZE = 5 * 1024 * 1024  # 5 MB
BACKUP_COUNT = 5

LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | "
    "%(name)s | %(message)s"
)

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

def configure_logging() -> logging.Logger:
    """
    Configure console and rotating file logging.

    The application log is stored in backend/logs/application.log.
    Older log files are rotated automatically.
    """

    LOG_DIR.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)

    # Avoid installing our handlers more than once.
    if getattr(root_logger, "_averra_logging_configured", False):
        return logging.getLogger("averra")

    formatter = logging.Formatter(
        fmt=LOG_FORMAT,
        datefmt=DATE_FORMAT,
    )

    # Console output for the development terminal.
    console_handler = logging.StreamHandler()
    console_handler.setLevel(LOG_LEVEL)
    console_handler.setFormatter(formatter)

    # Rotating application log.
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
