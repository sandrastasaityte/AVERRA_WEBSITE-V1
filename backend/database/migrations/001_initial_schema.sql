
-- ============================================================
-- AVERRA STAFFING SOLUTIONS LTD
-- Migration: 001_initial_schema.sql
-- Purpose: Create the initial AVERRA database tables
-- Database: SQLite
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- Website enquiries
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name VARCHAR(150) NOT NULL
        CHECK (length(trim(name)) > 0),

    email VARCHAR(254) NOT NULL
        CHECK (length(trim(email)) > 0),

    phone VARCHAR(40),
    company VARCHAR(200),
    subject VARCHAR(200),

    message TEXT NOT NULL
        CHECK (length(trim(message)) > 0),

    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (
            status IN (
                'new',
                'in_progress',
                'responded',
                'closed',
                'spam'
            )
        ),

    internal_notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes aligned with the SQLAlchemy Enquiry model.

CREATE INDEX IF NOT EXISTS ix_enquiries_email
    ON enquiries(email);

CREATE INDEX IF NOT EXISTS ix_enquiries_status
    ON enquiries(status);

CREATE INDEX IF NOT EXISTS ix_enquiries_created_at
    ON enquiries(created_at);


-- ------------------------------------------------------------
-- Job vacancies
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title VARCHAR(200) NOT NULL
        CHECK (length(trim(title)) > 0),

    department VARCHAR(150),

    location VARCHAR(200) NOT NULL
        CHECK (length(trim(location)) > 0),

    employment_type VARCHAR(100) NOT NULL
        CHECK (length(trim(employment_type)) > 0),

    summary TEXT NOT NULL
        CHECK (length(trim(summary)) > 0),

    description TEXT NOT NULL
        CHECK (length(trim(description)) > 0),

    salary_range VARCHAR(150),
    application_email VARCHAR(254),

    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'published',
                'closed',
                'archived'
            )
        ),

    closing_date DATE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for public vacancy listings and filtering.

CREATE INDEX IF NOT EXISTS ix_jobs_status
    ON jobs(status);

CREATE INDEX IF NOT EXISTS ix_jobs_created_at
    ON jobs(created_at);

CREATE INDEX IF NOT EXISTS ix_jobs_location
    ON jobs(location);


-- ------------------------------------------------------------
-- Migration tracking
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations (version)
VALUES ('001_initial_schema');
