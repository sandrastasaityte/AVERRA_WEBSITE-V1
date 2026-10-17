
# AVERRA Staffing Solutions Ltd
## Backend API Documentation

**Project:** AVERRA Staffing Solutions Ltd  
**Purpose:** Connect UK businesses with skilled professionals based in India.  
**Backend framework:** FastAPI  
**Initial database:** SQLite  
**API version:** 1.0.0  
**Status:** Development

---

## 1. Overview

The AVERRA backend supports the company website and will progressively support staffing operations.

The initial API covers:

- Website contact and business enquiries
- Public job vacancy listings
- Job vacancy details
- API health checks
- Database access through SQLAlchemy

Planned future functionality includes:

- Authenticated job vacancy management
- Candidate applications and records
- Client and staffing records
- Administrative dashboards
- Integration with the AVERRA CRM

Features must be tested before being considered operational.

## 2. Project Structure

The current database connection file and migration are located outside `app/`.

```text
backend/
├── app/
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── enquiry.py
│   │   └── job.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── enquiries.py
│   │   └── jobs.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── enquiry.py
│   │   └── jobs.py
│   └── main.py
├── database/
│   ├── __init__.py
│   ├── connection.py
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   └── API_DOCUMENTATION.md
├── data/
│   └── verra.db
├── tests/
├── requirements.txt
├── .env.example
└── .gitignore
```

**Note:** Confirm the actual filename and location of the application entry point. The database filename shown above should be `averra.db`; the expected path is `backend/data/averra.db`.

## 3. Running the API

Open a terminal in the project root:

```powershell
cd "C:\Users\Sandra Stasaityte\Workplace\AVERRA_WEBSITE_v1"
```

Install the backend dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

If `backend/app/main.py` contains the FastAPI application instance named `app`, start the server from the project root using:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

If the application entry point is instead `backend/main.py`, use the corresponding module command:

```powershell
python -m uvicorn main:app --app-dir backend --reload
```

Use only the command that matches your actual file structure.

Default local address:

http://127.0.0.1:8000

Interactive API documentation:

http://127.0.0.1:8000/docs

Alternative API documentation:

http://127.0.0.1:8000/redoc

## 4. API Endpoints

The route modules reviewed so far define the following intended endpoints, assuming the routers are registered under `/api`.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Return API health information | Public |
| POST | `/api/enquiries` | Submit a website enquiry | Public |
| GET | `/api/jobs` | List published vacancies | Public |
| GET | `/api/jobs/{job_id}` | Retrieve a published vacancy | Public |

The following endpoint is optional and has not yet been confirmed:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome message |

Job management endpoints and an administrative enquiry list must not be exposed publicly without authentication and authorisation.

Confirm the endpoints through `/docs` after starting the application.

## 5. Health Check

**Endpoint:** `GET /api/health`

The health route returns information such as:

- API status
- Application name
- Company name
- Timestamp

A successful response indicates that the health endpoint responded. It does not necessarily prove that the database is available.

## 6. Website Enquiries

**Endpoint:** `POST /api/enquiries`

The enquiry schema supports:

- Name
- Email address
- Phone number
- Company name
- Subject
- Message

The request is validated using Pydantic before the enquiry is saved.

The reviewed schema defines the following enquiry statuses:

- `new`
- `in_progress`
- `responded`
- `closed`

The database migration must use the same status values as the application models and schemas.

Public enquiry responses must not expose internal notes or other private administrative information.

Expected validation behaviour includes rejection of missing required fields, invalid email addresses and messages outside the permitted length.

## 7. Job Vacancies

Public endpoints:

- `GET /api/jobs`
- `GET /api/jobs/{job_id}`

Job fields include:

- Job title
- Department
- Location
- Employment type
- Summary
- Full description
- Salary range
- Application email
- Publication status
- Closing date, if implemented in the model and route

Supported employment types:

- `Full-time`
- `Part-time`
- `Contract`
- `Temporary`
- `Freelance`
- `Internship`

Supported job statuses:

- `draft`
- `published`
- `closed`

Only published vacancies should appear on the public Careers page. Vacancies that have passed their closing date should also be excluded if closing-date filtering is implemented.

Job creation, editing, publishing and closing should be restricted to authorised administrators.

## 8. Database Configuration

The initial database is SQLite, accessed through SQLAlchemy.

The default database location configured in `database/connection.py` is:

`backend/data/averra.db`

The `DATABASE_URL` environment variable can override the default connection URL.

The `get_db()` dependency provides a database session to FastAPI routes and closes the session when the request finishes.

The `create_tables()` function creates missing tables from registered SQLAlchemy models. It does not execute SQL migration files or alter existing tables.

Migration scripts are stored in:

`backend/database/migrations/`

Database migrations must be applied deliberately and tested against existing data. Creating a migration file does not automatically apply it.

## 9. Security Requirements

Before production deployment:

- Keep secrets and credentials out of source control.
- Configure allowed website origins explicitly.
- Validate incoming data and impose appropriate request-size limits.
- Protect administrative endpoints with authentication and authorisation.
- Add rate limiting and spam protection to public forms.
- Use HTTPS in production.
- Restrict access to candidate, client and enquiry records.
- Back up the database and test restoration.
- Avoid returning internal notes or confidential information in public responses.
- Configure and validate secure file uploads before enabling uploads.
- Store and manage production secrets securely.
- Avoid exposing detailed exception messages to public API clients.

## 10. Privacy and Data Protection

AVERRA should collect only personal information necessary for its stated purposes.

Candidate, client and enquiry records should have appropriate access controls, retention rules and privacy information.

Review applicable UK GDPR and other relevant data protection requirements before launching the system.

## 11. Testing Checklist

- [ ] API starts successfully.
- [ ] Health endpoint returns the expected response.
- [ ] Database connectivity is verified.
- [ ] Valid contact enquiries can be submitted.
- [ ] Invalid enquiries are rejected.
- [ ] Enquiries are saved in the database.
- [ ] Public responses exclude internal notes.
- [ ] Published vacancies can be retrieved.
- [ ] Draft and closed vacancies are not publicly listed.
- [ ] Expired vacancies are excluded if closing-date filtering is enabled.
- [ ] Administrative functions require authorisation.
- [ ] Website-to-API integration works.
- [ ] Database migrations match the SQLAlchemy models.
- [ ] Production secrets are configured securely.
- [ ] Database backup and restoration are tested.

## 12. Development Roadmap

1. Configure the backend environment.
2. Align SQLAlchemy models, Pydantic schemas and database migrations.
3. Configure application startup and database initialisation.
4. Implement and test health, enquiry and job routes.
5. Connect the frontend contact form.
6. Connect the Careers page to published vacancies.
7. Add authentication and authorisation for administration.
8. Add automated tests.
9. Deploy the API and database securely.
10. Integrate the AVERRA CRM.

---

**AVERRA Staffing Solutions Ltd**  
Website: https://averrastaffing.co.uk  
Contact: info@averrastaffing.co.uk
