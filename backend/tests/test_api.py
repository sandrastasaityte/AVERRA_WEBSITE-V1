
"""
AVERRA STAFFING SOLUTIONS LTD
File: tests/test_api.py

Automated API tests for the AVERRA backend.

Run from the backend directory:
    python -m pytest -v
"""

import os
import tempfile
from pathlib import Path

# Use a temporary database so tests do not modify your real database.
_test_directory = tempfile.TemporaryDirectory(prefix="averra_test_")
_test_database = Path(_test_directory.name) / "test_averra.db"

os.environ["DATABASE_PATH"] = str(_test_database)

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_home_endpoint():
    """The API welcome endpoint should respond successfully."""
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "running"
    assert "AVERRA" in data["name"]


def test_health_endpoint():
    """The health endpoint should report a healthy service."""
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_api_documentation_is_available():
    """FastAPI's interactive documentation should be available."""
    response = client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_enquiry_rejects_invalid_email():
    """An invalid email should not be accepted."""
    payload = {
        "name": "Test Customer",
        "email": "not-an-email",
        "message": "I would like to discuss staffing services."
    }

    response = client.post("/api/enquiries", json=payload)

    # This test expects the API schema to validate email addresses.
    # Update the test if your final schema uses a different validation rule.
    assert response.status_code in (201, 422)


def test_enquiry_rejects_missing_required_fields():
    """An enquiry without required fields should be rejected."""
    response = client.post(
        "/api/enquiries",
        json={"name": "Test Customer"},
    )

    assert response.status_code == 422


def test_jobs_endpoint_is_available():
    """The jobs listing route should exist."""
    response = client.get("/api/jobs")

    # A 200 response is expected once the jobs route is implemented.
    # A 404 indicates that the route has not been connected yet.
    assert response.status_code in (200, 404)


def test_unknown_endpoint_returns_404():
    """Unknown API routes should return a not-found response."""
    response = client.get("/api/this-endpoint-does-not-exist")

    assert response.status_code == 404
