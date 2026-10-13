
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
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status
    ON enquiries(status);

CREATE INDEX IF NOT EXISTS idx_enquiries_created_at
    ON enquiries(created_at);

-- ------------------------------------------------------------
-- Job vacancies
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT NOT NULL,
    employment_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    salary_range TEXT,
    application_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
    ON jobs(created_at);

-- ------------------------------------------------------------
-- Migration tracking
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations (version)
VALUES ('001_initial_schema');
