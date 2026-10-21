
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
LOG_FILE = LOG_DIR / "application.log"

VALID_LOG_LEVELS = {
    "DEBUG",
    "INFO",
    "WARNING",
    "ERROR",
    "CRITICAL",
}

LOG_LEVEL_NAME = os.getenv("LOG_LEVEL", "INFO").strip().upper()

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

_CONFIGURATION_FLAG = "_averra_logging_configured"


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

def configure_logging() -> logging.Logger:
    """
    Configure console and rotating file logging.

    The application log is stored in backend/logs/application.log.
    Up to five rotated backup files are retained.

    Calling this function repeatedly does not add duplicate
    AVERRA handlers.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)

    if getattr(root_logger, _CONFIGURATION_FLAG, False):
        return logging.getLogger("averra")

    formatter = logging.Formatter(
        fmt=LOG_FORMAT,
        datefmt=DATE_FORMAT,
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(LOG_LEVEL)
    console_handler.setFormatter(formatter)

    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)

        application_handler = RotatingFileHandler(
            filename=LOG_FILE,
            maxBytes=MAX_LOG_SIZE,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
            delay=True,
        )
        application_handler.setLevel(LOG_LEVEL)
        application_handler.setFormatter(formatter)

    except OSError:
        # Continue with console logging if the log file cannot
        # be created or opened.
        console_handler.setLevel(LOG_LEVEL)
        root_logger.addHandler(console_handler)

        logger = logging.getLogger("averra")
        logger.error(
            "File logging could not be configured. "
            "Continuing with console logging.",
            exc_info=True,
        )

        setattr(root_logger, _CONFIGURATION_FLAG, True)
        return logger

    root_logger.addHandler(console_handler)
    root_logger.addHandler(application_handler)

    setattr(root_logger, _CONFIGURATION_FLAG, True)

    logger = logging.getLogger("averra")
    logger.info("AVERRA logging configured.")

    return logger


logger = configure_logging()
