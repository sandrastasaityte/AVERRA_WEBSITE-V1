
/*
 * AVERRA STAFFING SOLUTIONS LTD
 * File: frontend/images/jobs.js
 * Version: 3.0.0
 *
 * Uses the AVERRA FastAPI public jobs endpoint.
 * No Supabase dependency.
 *
 * Local API: http://127.0.0.1:8000/api/jobs
 *
 * For a separately hosted production API, define this before loading
 * this file:
 * window.AVERRA_API_BASE_URL = "https://your-api-domain.example";
 *
 * CV/application submission is intentionally not simulated.
 * A secure backend application endpoint must be implemented first.
 */

(() => {
    "use strict";

    const API_BASE_URL = (
        window.AVERRA_API_BASE_URL ||
        (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
                ? "http://127.0.0.1:8000"
                : window.location.origin
        )
    ).replace(/\/+$/, "");

    const JOBS_ENDPOINT = `${API_BASE_URL}/api/jobs`;
    const MAX_CV_SIZE = 5 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

    const $ = id => document.getElementById(id);

    const jobsGrid = $("jobs-grid");
    const jobsStatus = $("jobs-status");
    const jobsCount = $("jobs-results-count");
    const searchInput = $("job-search");
    const categoryFilter = $("job-category-filter");

    const applicationForm = $("cv-application-form");
    const vacancySelect = $("applicant-role");
    const cvInput = $("applicant-cv");
    const submitButton = $("cv-submit-button");
    const applicationStatus = $("cv-application-status");

    let publishedJobs = [];
    let jobsLoaded = false;

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.className = `jobs-message ${type}`;
        element.hidden = false;
    }

    function hideMessage(element) {
        if (!element) return;

        element.hidden = true;
        element.textContent = "";
    }

    function makeElement(tag, className = "", text = "") {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== null && text !== undefined) {
            element.textContent = String(text);
        }

        return element;
    }

    function normaliseText(value, fallback = "") {
        if (value === null || value === undefined) {
            return fallback;
        }

        const text = String(value).trim();
        return text || fallback;
    }

    function normaliseDepartment(job) {
        return normaliseText(job.department, "Other");
    }

    function formatClosingDate(value) {
        if (!value) return "";

        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));

        if (!match) {
            return String(value);
        }

        const date = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function isClosedByDate(job) {
        if (!job.closing_date) return false;

        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(
            String(job.closing_date)
        );

        if (!match) return false;

        const closingDate = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

        closingDate.setHours(23, 59, 59, 999);

        return closingDate.getTime() < Date.now();
    }

    function normaliseJob(job) {
        return {
            id: job.id,
            title: normaliseText(job.title, "Untitled vacancy"),
            department: normaliseDepartment(job),
            location: normaliseText(job.location, "Location not specified"),
            employmentType: normaliseText(
                job.employment_type,
                "Employment type not specified"
            ),
            summary: normaliseText(job.summary),
            description: normaliseText(job.description),
            salaryRange: normaliseText(job.salary_range),
            closingDate: job.closing_date || null,
            createdAt: job.created_at || null
        };
    }

    function createJobCard(job) {
        const card = makeElement("article", "job-card");

        card.appendChild(
            makeElement("span", "job-category", job.department)
        );

        card.appendChild(
            makeElement("h3", "", job.title)
        );

        const meta = makeElement("div", "job-meta");

        meta.appendChild(
            makeElement("span", "", `Location: ${job.location}`)
        );

        meta.appendChild(
            makeElement("span", "", `Employment: ${job.employmentType}`)
        );

        if (job.salaryRange) {
            meta.appendChild(
                makeElement("span", "", `Salary: ${job.salaryRange}`)
            );
        }

        if (job.closingDate) {
            meta.appendChild(
                makeElement(
                    "span",
                    "",
                    `Closing date: ${formatClosingDate(job.closingDate)}`
                )
            );
        }

        card.appendChild(meta);

        if (job.summary) {
            card.appendChild(
                makeElement("p", "job-description", job.summary)
            );
        }

        if (job.description) {
            const details = makeElement("details", "job-details");
            const summary = makeElement("summary", "", "Full job description");
            const description = makeElement(
                "p",
                "job-description",
                job.description
            );

            details.appendChild(summary);
            details.appendChild(description);
            card.appendChild(details);
        }

        const applyButton = makeElement(
            "a",
            "jobs-button",
            "Apply for This Job"
        );

        applyButton.href = "#submit-cv";
        applyButton.addEventListener("click", () => {
            if (vacancySelect) {
                vacancySelect.value = String(job.id);
            }
        });

        card.appendChild(applyButton);

        return card;
    }

    function getFilteredJobs() {
        const term = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const department = categoryFilter
            ? categoryFilter.value
            : "";

        return publishedJobs.filter(job => {
            if (isClosedByDate(job)) return false;

            const searchableText = [
                job.title,
                job.department,
                job.location,
                job.employmentType,
                job.salaryRange,
                job.summary,
                job.description
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesTerm =
                !term || searchableText.includes(term);

            const matchesDepartment =
                !department || job.department === department;

            return matchesTerm && matchesDepartment;
        });
    }

    function renderJobs() {
        if (!jobsGrid || !jobsCount) return;

        const filtered = getFilteredJobs();
        jobsGrid.replaceChildren();

        if (filtered.length === 0) {
            const empty = makeElement("div", "jobs-empty");

            empty.appendChild(
                makeElement(
                    "h3",
                    "",
                    publishedJobs.length
                        ? "No Matching Vacancies Found"
                        : "No Current Vacancies"
                )
            );

            empty.appendChild(
                makeElement(
                    "p",
                    "",
                    publishedJobs.length
                        ? "Try another search term or select a different department."
                        : "There are currently no published vacancies. Please check again soon or submit a general application."
                )
            );

            jobsGrid.appendChild(empty);
        } else {
            filtered.forEach(job => {
                jobsGrid.appendChild(createJobCard(job));
            });
        }

        const count = filtered.length;

        jobsCount.textContent =
            `${count} ${count === 1 ? "vacancy" : "vacancies"} displayed`;

        if (jobsLoaded) {
            hideMessage(jobsStatus);
        }
    }

    function populateCategories() {
        if (!categoryFilter) return;

        const previous = categoryFilter.value;

        const departments = [
            ...new Set(
                publishedJobs.map(job => job.department)
            )
        ].sort((a, b) => a.localeCompare(b));

        categoryFilter.replaceChildren(
            new Option("All Categories", "")
        );

        departments.forEach(department => {
            categoryFilter.add(
                new Option(department, department)
            );
        });

        if (departments.includes(previous)) {
            categoryFilter.value = previous;
        }
    }

    function populateVacancySelect() {
        if (!vacancySelect) return;

        const previous = vacancySelect.value;

        vacancySelect.replaceChildren(
            new Option("General Application", "general")
        );

        publishedJobs
            .filter(job => !isClosedByDate(job))
            .forEach(job => {
                vacancySelect.add(
                    new Option(job.title, String(job.id))
                );
            });

        if (
            previous === "general" ||
            publishedJobs.some(
                job => String(job.id) === previous &&
                       !isClosedByDate(job)
            )
        ) {
            vacancySelect.value = previous;
        } else {
            vacancySelect.value = "general";
        }
    }

    async function loadPublishedJobs() {
        if (jobsGrid) {
            jobsGrid.replaceChildren(
                makeElement("div", "jobs-empty", "Loading current vacancies…")
            );
        }

        if (jobsCount) {
            jobsCount.textContent = "Loading vacancies…";
        }

        if (vacancySelect) {
            vacancySelect.replaceChildren(
                new Option("Loading published vacancies…", "")
            );
        }

        hideMessage(jobsStatus);

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            15000
        );

        try {
            const response = await fetch(JOBS_ENDPOINT, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: controller.signal,
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(
                    `The jobs service returned HTTP ${response.status}.`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error(
                    "The jobs API returned an unexpected response format."
                );
            }

            publishedJobs = data
                .filter(job =>
                    job &&
                    Number.isInteger(Number(job.id)) &&
                    job.title &&
                    job.location &&
                    job.employment_type
                )
                .map(normaliseJob)
                .filter(job => !isClosedByDate(job));

            jobsLoaded = true;

            populateCategories();
            populateVacancySelect();
            renderJobs();

            if (publishedJobs.length === 0) {
                showMessage(
                    jobsStatus,
                    "The API is connected, but there are currently no published vacancies with valid details.",
                    "info"
                );
            }
        } catch (error) {
            console.error("AVERRA jobs API error:", error);

            publishedJobs = [];
            jobsLoaded = false;

            if (jobsGrid) {
                jobsGrid.replaceChildren(
                    makeElement(
                        "div",
                        "jobs-empty",
                        "Vacancies are temporarily unavailable."
                    )
                );
            }

            if (jobsCount) {
                jobsCount.textContent = "Unable to load vacancies";
            }

            if (vacancySelect) {
                vacancySelect.replaceChildren(
                    new Option("General Application", "general")
                );
            }

            const message = error.name === "AbortError"
                ? "The jobs service took too long to respond. Please try again."
                : "We couldn't load current vacancies. Check that the AVERRA API is running and that CORS allows this website to connect.";

            showMessage(jobsStatus, message, "error");
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function validateCv(file) {
        if (!file) {
            return "Please select your CV before submitting.";
        }

        if (file.size <= 0) {
            return "The selected CV file is empty.";
        }

        if (file.size > MAX_CV_SIZE) {
            return "Your CV must be no larger than 5 MB.";
        }

        const parts = file.name.split(".");
        const extension = parts.length > 1
            ? parts.pop().toLowerCase()
            : "";

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return "Please upload a PDF, DOC or DOCX file.";
        }

        return null;
    }

    function handleApplicationSubmit(event) {
        event.preventDefault();

        hideMessage(applicationStatus);

        if (!applicationForm || !applicationForm.reportValidity()) {
            return;
        }

        const file = cvInput && cvInput.files
            ? cvInput.files[0]
            : null;

        const cvError = validateCv(file);

        if (cvError) {
            showMessage(applicationStatus, cvError, "error");
            return;
        }

        /*
         * IMPORTANT:
         * This frontend intentionally does not claim to submit an application.
         * Implement a secure FastAPI endpoint for multipart CV uploads,
         * server-side validation, private file storage, and database records
         * before enabling real submissions.
         */

        showMessage(
            applicationStatus,
            "Your details have not been sent. Online CV submission is being configured. Please email your CV and the vacancy title to info@averrastaffing.co.uk.",
            "info"
        );

        console.info(
            "Application form validated locally. No application or CV was uploaded."
        );
    }

    function initialiseNavigation() {
        const menuButton = $("menu-toggle");
        const navigation = $("main-navigation");

        if (!menuButton || !navigation) return;

        menuButton.addEventListener("click", () => {
            const isOpen = navigation.classList.toggle("is-open");

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuButton.setAttribute(
                "aria-label",
                isOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );
        });

        navigation.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navigation.classList.remove("is-open");
                menuButton.setAttribute("aria-expanded", "false");
                menuButton.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );
            });
        });
    }

    function initialise() {
        const yearElement = $("current-year");

        if (yearElement) {
            yearElement.textContent = String(new Date().getFullYear());
        }

        if (searchInput) {
            searchInput.addEventListener("input", renderJobs);
        }

        if (categoryFilter) {
            categoryFilter.addEventListener("change", renderJobs);
        }

        if (applicationForm) {
            applicationForm.addEventListener(
                "submit",
                handleApplicationSubmit
            );
        }

        initialiseNavigation();
        loadPublishedJobs();

        /*
         * Optional manual refresh:
         * window.AVERRAJobs.reload()
         */
        window.AVERRAJobs = {
            reload: loadPublishedJobs,
            getJobs: () => publishedJobs.slice()
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise, {
            once: true
        });
    } else {
        initialise();
    }
})();
