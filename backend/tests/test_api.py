
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/tests/test_api.py

Automated API tests for the AVERRA backend.

Run from the backend directory:
    python -m pytest -v
"""

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# ============================================================
# ISOLATED TEST DATABASE
# ============================================================
# Configure the test database before importing the application
# or any database modules.
#
# This prevents these tests from intentionally targeting the
# normal development database.

_test_directory = tempfile.TemporaryDirectory(
    prefix="averra_test_"
)

_test_database = Path(_test_directory.name) / "test_averra.db"
_test_database_url = f"sqlite:///{_test_database.as_posix()}"

os.environ["DATABASE_URL"] = _test_database_url
os.environ["DATABASE_PATH"] = str(_test_database)

# Keep SQL statement logging disabled during ordinary tests.
os.environ.setdefault("SQL_ECHO", "false")


# Import only after setting the test database environment.
# This assumes backend/app/main.py is the application entry point.
from main import app  # noqa: E402


# ============================================================
# TEST CLIENT
# ============================================================

@pytest.fixture(scope="module")
def client():
    """
    Create a test client and run application startup and
    shutdown handlers through the TestClient context manager.
    """
    with TestClient(app) as test_client:
        yield test_client


# ============================================================
# HOME AND HEALTH ENDPOINTS
# ============================================================

def test_home_endpoint(client):
    """The API welcome endpoint should respond successfully."""
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "running"
    assert "AVERRA" in data["name"]


def test_health_endpoint(client):
    """The health endpoint should report a healthy service."""
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_api_documentation_is_available(client):
    """FastAPI's interactive documentation should be available."""
    response = client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers.get(
        "content-type", ""
    )


# ============================================================
# ENQUIRY VALIDATION
# ============================================================

def test_enquiry_rejects_invalid_email(client):
    """An enquiry with an invalid email should be rejected."""
    payload = {
        "name": "Test Customer",
        "email": "not-an-email",
        "message": (
            "I would like to discuss staffing services."
        ),
    }

    response = client.post("/api/enquiries", json=payload)

    assert response.status_code == 422


def test_enquiry_rejects_missing_required_fields(client):
    """An enquiry missing required fields should be rejected."""
    response = client.post(
        "/api/enquiries",
        json={"name": "Test Customer"},
    )

    assert response.status_code == 422


def test_enquiry_rejects_empty_payload(client):
    """An empty enquiry payload should fail validation."""
    response = client.post("/api/enquiries", json={})

    assert response.status_code == 422


# ============================================================
# PUBLIC JOBS ENDPOINT
# ============================================================

def test_jobs_endpoint_is_available(client):
    """The public jobs listing endpoint should exist."""
    response = client.get("/api/jobs")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_job_detail_for_nonexistent_id_returns_not_found(client):
    """
    Requesting a job with an ID that should not exist
    should return HTTP 404.
    """
    response = client.get("/api/jobs/999999999")

    assert response.status_code == 404


# ============================================================
# UNKNOWN ENDPOINT
# ============================================================

def test_unknown_endpoint_returns_404(client):
    """Unknown API routes should return a not-found response."""
    response = client.get(
        "/api/this-endpoint-does-not-exist"
    )

    assert response.status_code == 404
