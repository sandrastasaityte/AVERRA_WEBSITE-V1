
"""
AVERRA STAFFING SOLUTIONS LTD
File: backend/tests/test_api.py

Automated API tests for the AVERRA backend.

Run from the backend directory:
    python -m pytest -v
"""

import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# ============================================================
# ISOLATED TEST DATABASE
# ============================================================

_test_directory = tempfile.TemporaryDirectory(prefix="averra_test_")
_test_database = Path(_test_directory.name) / "test_averra.db"

os.environ["DATABASE_URL"] = f"sqlite:///{_test_database.as_posix()}"
os.environ["DATABASE_PATH"] = str(_test_database)
os.environ.setdefault("SQL_ECHO", "false")


# Import after configuring the test database.
from main import app  # noqa: E402


# Test-only token. Never use your real administrator token here.
TEST_ADMIN_TOKEN = "AVERRA_TEST_ONLY_TOKEN_92841"

# Set after importing main because the application may load .env
# during import. The authentication function reads this variable
# when each request is made.
os.environ["AVERRA_ADMIN_TOKEN"] = TEST_ADMIN_TOKEN


# ============================================================
# TEST CLIENT AND HELPERS
# ============================================================

@pytest.fixture(scope="module")
def client():
    """Start the app and close it after the test module finishes."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def admin_headers():
    """Headers for authenticated administrator requests."""
    return {"X-Admin-Token": TEST_ADMIN_TOKEN}


def job_payload(**overrides):
    """Return a valid vacancy payload with optional overrides."""
    payload = {
        "title": "Finance Operations Specialist",
        "department": "Finance",
        "location": "Remote - India",
        "employment_type": "Full-time",
        "summary": "Support finance operations for UK businesses.",
        "description": (
            "Work with the finance team to support daily operations, "
            "reporting, reconciliations and business administration."
        ),
        "salary_range": "Competitive",
        "application_email": "info@averrastaffing.co.uk",
        "status": "draft",
        "closing_date": None,
    }
    payload.update(overrides)
    return payload


def create_job(client, headers, **overrides):
    """Create a vacancy through the real admin API."""
    response = client.post(
        "/api/admin/jobs",
        json=job_payload(**overrides),
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


# ============================================================
# HOME AND HEALTH ENDPOINTS
# ============================================================

def test_home_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "AVERRA" in data["name"]


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_api_documentation_is_available(client):
    response = client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")


# ============================================================
# ENQUIRY VALIDATION
# ============================================================

def test_enquiry_rejects_invalid_email(client):
    payload = {
        "name": "Test Customer",
        "email": "not-an-email",
        "message": "I would like to discuss staffing services.",
    }

    response = client.post("/api/enquiries", json=payload)

    assert response.status_code == 422


def test_enquiry_rejects_missing_required_fields(client):
    response = client.post(
        "/api/enquiries",
        json={"name": "Test Customer"},
    )

    assert response.status_code == 422


def test_enquiry_rejects_empty_payload(client):
    response = client.post("/api/enquiries", json={})

    assert response.status_code == 422


# ============================================================
# PUBLIC JOB ENDPOINTS
# ============================================================

def test_jobs_endpoint_is_available(client):
    response = client.get("/api/jobs")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_job_detail_for_nonexistent_id_returns_not_found(client):
    response = client.get("/api/jobs/999999999")

    assert response.status_code == 404


def test_public_jobs_only_include_published_unexpired_jobs(
    client, admin_headers
):
    future_date = (
        datetime.now(timezone.utc).date() + timedelta(days=30)
    ).isoformat()

    expired_date = (
        datetime.now(timezone.utc).date() - timedelta(days=2)
    ).isoformat()

    published_job = create_job(
        client,
        admin_headers,
        title="Published Test Vacancy",
        status="published",
        closing_date=future_date,
    )

    create_job(
        client,
        admin_headers,
        title="Expired Test Vacancy",
        status="published",
        closing_date=expired_date,
    )

    create_job(
        client,
        admin_headers,
        title="Draft Test Vacancy",
        status="draft",
        closing_date=future_date,
    )

    response = client.get("/api/jobs")

    assert response.status_code == 200
    returned_ids = {job["id"] for job in response.json()}

    assert published_job["id"] in returned_ids

    # Draft and expired vacancies must not appear publicly.
    returned_titles = {
        job["title"] for job in response.json()
    }
    assert "Expired Test Vacancy" not in returned_titles
    assert "Draft Test Vacancy" not in returned_titles


def test_public_job_detail_hides_draft_job(client, admin_headers):
    draft = create_job(
        client,
        admin_headers,
        title="Private Draft Vacancy",
        status="draft",
    )

    response = client.get(f"/api/jobs/{draft['id']}")

    assert response.status_code == 404


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def test_admin_enquiries_requires_authentication(client):
    response = client.get("/api/admin/enquiries")

    assert response.status_code == 401


def test_admin_jobs_requires_authentication(client):
    response = client.get("/api/admin/jobs")

    assert response.status_code == 401


def test_admin_job_creation_requires_authentication(client):
    response = client.post(
        "/api/admin/jobs",
        json=job_payload(),
    )

    assert response.status_code == 401


def test_admin_rejects_invalid_token(client):
    response = client.get(
        "/api/admin/jobs",
        headers={"X-Admin-Token": "definitely-not-the-test-token"},
    )

    assert response.status_code == 401


def test_admin_can_list_jobs(client, admin_headers):
    response = client.get(
        "/api/admin/jobs",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ============================================================
# ADMIN VACANCY MANAGEMENT
# ============================================================

def test_admin_can_create_draft_job(client, admin_headers):
    job = create_job(
        client,
        admin_headers,
        title="Created Through Test API",
    )

    assert job["id"] > 0
    assert job["title"] == "Created Through Test API"
    assert job["status"] == "draft"
    assert job["location"] == "Remote - India"


def test_admin_can_publish_job(client, admin_headers):
    job = create_job(
        client,
        admin_headers,
        title="Vacancy Ready To Publish",
    )

    response = client.patch(
        f"/api/admin/jobs/{job['id']}",
        json={"status": "published"},
        headers=admin_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "published"


def test_admin_can_update_job_closing_date(client, admin_headers):
    job = create_job(
        client,
        admin_headers,
        title="Vacancy Closing Date Test",
    )

    new_closing_date = (
        datetime.now(timezone.utc).date() + timedelta(days=45)
    ).isoformat()

    response = client.patch(
        f"/api/admin/jobs/{job['id']}",
        json={"closing_date": new_closing_date},
        headers=admin_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["closing_date"] == new_closing_date


def test_admin_update_nonexistent_job_returns_404(
    client, admin_headers
):
    response = client.patch(
        "/api/admin/jobs/999999999",
        json={"status": "published"},
        headers=admin_headers,
    )

    assert response.status_code == 404


def test_admin_create_job_rejects_invalid_data(client, admin_headers):
    invalid_payload = job_payload(title="X")

    response = client.post(
        "/api/admin/jobs",
        json=invalid_payload,
        headers=admin_headers,
    )

    assert response.status_code == 422


def test_admin_update_rejects_invalid_status(client, admin_headers):
    job = create_job(
        client,
        admin_headers,
        title="Invalid Status Test Vacancy",
    )

    response = client.patch(
        f"/api/admin/jobs/{job['id']}",
        json={"status": "something_invalid"},
        headers=admin_headers,
    )

    assert response.status_code == 422


# ============================================================
# UNKNOWN ENDPOINT
# ============================================================

def test_unknown_endpoint_returns_404(client):
    response = client.get("/api/this-endpoint-does-not-exist")

    assert response.status_code == 404
