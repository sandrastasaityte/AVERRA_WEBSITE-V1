
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

The AVERRA backend will support the company's website and staffing operations.

Planned functionality includes:

- Website contact and business enquiries
- Job vacancy listings
- Job vacancy management
- Candidate applications
- Client and staffing records
- Health checks and API status
- Future integration with the AVERRA CRM

## 2. Project Structure

```text
backend/
├── app/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   └── services/
├── database/
│   └── migrations/
├── docs/
├── tests/
├── logs/
├── uploads/
├── main.py
├── requirements.txt
├── .env
├── .env.example
└── .gitignore
```

## 3. Running the API

Open a terminal in the `backend` directory.

Install the required packages:

```bash
python -m pip install -r requirements.txt
```

Start the development server:

```bash
python -m uvicorn main:app --reload
```

The default local API address is:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

Alternative API documentation:

`http://127.0.0.1:8000/redoc`

## 4. Planned API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome message |
| GET | `/api/health` | Check API status |
| POST | `/api/enquiries` | Submit a website enquiry |
| GET | `/api/jobs` | List published vacancies |
| GET | `/api/jobs/{job_id}` | View a vacancy |

These endpoints are planned and must be implemented and tested before being considered operational.

## 5. Enquiry Data

A website enquiry may contain:

- Name
- Email address
- Phone number
- Company name
- Subject
- Message

The API should validate submitted data and reject invalid requests.

## 6. Job Vacancy Data

A vacancy may contain:

- Job title
- Department
- Location
- Employment type
- Summary
- Full description
- Salary range
- Application email
- Publication status

Only published vacancies should appear on the public Careers page.

## 7. Database

The initial database is SQLite.

The migration folder stores SQL scripts used to manage changes to the database schema.

Database migrations must be executed in a controlled manner. Creating a migration file does not automatically apply it.

## 8. Security Requirements

Before production deployment:

- Keep secrets and credentials out of source code.
- Configure allowed website origins explicitly.
- Validate and limit incoming data.
- Protect administrative endpoints with authentication and authorization.
- Add rate limiting and spam protection to public forms.
- Use HTTPS in production.
- Restrict access to candidate and client data.
- Back up the database and test restoration.
- Never expose private records through public API endpoints.
- Configure secure file uploads if uploads are enabled.

## 9. Privacy and Data Protection

AVERRA should collect only the personal information necessary for its stated purposes.

Candidate and client records should have appropriate access controls, retention rules and privacy information.

Review applicable UK GDPR and other relevant data protection requirements before launching the system.

## 10. Testing Checklist

- [ ] API starts successfully.
- [ ] Health endpoint returns a successful response.
- [ ] Valid contact enquiries can be submitted.
- [ ] Invalid enquiries are rejected.
- [ ] Enquiries are saved in the database.
- [ ] Published vacancies can be retrieved.
- [ ] Draft and closed vacancies are not publicly listed.
- [ ] Administrative functions require authorization.
- [ ] Website-to-API integration works.
- [ ] Production secrets are configured securely.

## 11. Development Roadmap

1. Configure the backend environment.
2. Implement database models and schemas.
3. Implement health, enquiry and job routes.
4. Connect the frontend contact form.
5. Connect the Careers page to published vacancies.
6. Add authentication for administration.
7. Add automated tests.
8. Deploy the API and database securely.
9. Integrate the AVERRA CRM.

---

**AVERRA Staffing Solutions Ltd**  
Website: https://averrastaffing.co.uk  
Contact: info@averrastaffing.co.uk
