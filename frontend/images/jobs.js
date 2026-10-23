
"use strict";

/*
 * AVERRA STAFFING SOLUTIONS LTD
 * File: frontend/images/jobs.js
 * Version: 4.2.0
 *
 * FEATURES
 * - Loads published vacancies from the AVERRA FastAPI backend.
 * - Supports local development and separately deployed APIs.
 * - Accepts API responses as arrays or common object formats.
 * - Compact job cards with expandable full descriptions.
 * - Displays responsibilities, requirements, skills and benefits
 *   when these fields are provided by the backend.
 * - Preserves the complete description; no character truncation.
 * - Filters unpublished and expired vacancies.
 * - Safely renders API data without injecting HTML.
 * - Handles loading, empty states, timeouts, errors and retrying.
 * - Supports existing jobs-page selectors and mobile navigation.
 * - Does not pretend to submit applications or upload CVs.
 *
 * Optional configuration, set before this file loads:
 * window.AVERRA_API_BASE_URL = "https://your-api.onrender.com";
 *
 * Public endpoint:
 * GET /api/jobs
 */

(function () {
    "use strict";

    const VERSION = "4.2.0";

    const CONFIG = Object.freeze({
        email: "info@averrastaffing.co.uk",
        jobsEndpoint: "/api/jobs",
        requestTimeoutMs: 20000,
        defaultPageSize: 100
    });

    const SELECTORS = {
        jobsGrid: [
            "#jobsGrid",
            "#jobs-grid",
            "#job-listings",
            "#jobListings",
            "[data-jobs-grid]"
        ],
        jobsCount: [
            "#jobsCount",
            "#jobs-count",
            "#jobCount",
            "#job-count",
            "[data-jobs-count]"
        ],
        jobsStatus: [
            "#jobsStatus",
            "#jobs-status",
            "#jobsMessage",
            "#jobs-message",
            "[data-jobs-status]"
        ],
        retryButton: [
            "#retryJobs",
            "#retry-jobs",
            "[data-retry-jobs]"
        ],
        applicationForms: [
            "#jobApplicationForm",
            "#job-application-form",
            "#candidateApplicationForm",
            "#candidate-application-form",
            "#cvApplicationForm",
            "#cv-application-form",
            "[data-job-application-form]"
        ]
    };

    let loading = false;
    let lastJobs = [];
    let lastError = null;
    let activeController = null;
    let requestNumber = 0;

    /* ---------------------------------------------------------
       API CONFIGURATION
       --------------------------------------------------------- */

    function getApiBaseUrl() {
        const configured = window.AVERRA_API_BASE_URL;

        if (typeof configured === "string" && configured.trim()) {
            return configured.trim().replace(/\/+$/, "");
        }

        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        const isLocal =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1";

        if (isLocal && window.location.port !== "8000") {
            return "http://127.0.0.1:8000";
        }

        if (protocol === "http:" || protocol === "https:") {
            return window.location.origin;
        }

        return "http://127.0.0.1:8000";
    }

    const API_BASE_URL = getApiBaseUrl();

    function buildJobsUrl() {
        const url = new URL(
            CONFIG.jobsEndpoint,
            API_BASE_URL.endsWith("/")
                ? API_BASE_URL
                : API_BASE_URL + "/"
        );

        url.searchParams.set("limit", String(CONFIG.defaultPageSize));

        return url.toString();
    }

    /* ---------------------------------------------------------
       DOM HELPERS
       --------------------------------------------------------- */

    function findElement(selectors, root) {
        const searchRoot = root || document;

        for (const selector of selectors) {
            const element = searchRoot.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function findElements(selectors, root) {
        const searchRoot = root || document;
        const elements = new Set();

        selectors.forEach(function (selector) {
            searchRoot.querySelectorAll(selector).forEach(function (element) {
                elements.add(element);
            });
        });

        return Array.from(elements);
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function normaliseText(value, fallback) {
        if (value === null || value === undefined) {
            return fallback || "";
        }

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            return String(value).trim();
        }

        return fallback || "";
    }

    function getField(job, names, fallback) {
        if (!job || typeof job !== "object") {
            return fallback || "";
        }

        for (const name of names) {
            if (
                Object.prototype.hasOwnProperty.call(job, name) &&
                job[name] !== null &&
                job[name] !== undefined
            ) {
                const value = normaliseText(job[name]);

                if (value !== "") {
                    return value;
                }
            }
        }

        return fallback || "";
    }

    function getArrayField(job, names) {
        if (!job || typeof job !== "object") {
            return [];
        }

        for (const name of names) {
            const value = job[name];

            if (Array.isArray(value)) {
                return value
                    .map(function (item) {
                        if (typeof item === "string" ||
                            typeof item === "number") {
                            return String(item).trim();
                        }

                        if (item && typeof item === "object") {
                            return getField(item, [
                                "title",
                                "name",
                                "label",
                                "text",
                                "description"
                            ]);
                        }

                        return "";
                    })
                    .filter(Boolean);
            }

            if (typeof value === "string" && value.trim()) {
                return value
                    .split(/\r?\n|•/)
                    .map(function (item) {
                        return item.replace(/^\s*[-*]\s*/, "").trim();
                    })
                    .filter(Boolean);
            }
        }

        return [];
    }

    function setStatus(message, type) {
        const status = findElement(SELECTORS.jobsStatus);

        if (status) {
            status.textContent = message;
            status.hidden = !message;
            status.dataset.state = type || "info";
            status.setAttribute(
                "role",
                type === "error" ? "alert" : "status"
            );
            status.setAttribute("aria-live", "polite");
            return;
        }

        const grid = findElement(SELECTORS.jobsGrid);

        if (!grid) {
            return;
        }

        let fallback = grid.querySelector("[data-jobs-fallback-status]");

        if (!message) {
            if (fallback) {
                fallback.remove();
            }
            return;
        }

        if (!fallback) {
            fallback = createElement("p", "jobs-status");
            fallback.dataset.jobsFallbackStatus = "true";
            fallback.setAttribute(
                "role",
                type === "error" ? "alert" : "status"
            );
            fallback.setAttribute("aria-live", "polite");
            grid.prepend(fallback);
        }

        fallback.textContent = message;
        fallback.dataset.state = type || "info";
    }

    function setJobsCount(count) {
        const element = findElement(SELECTORS.jobsCount);

        if (!element) {
            return;
        }

        if (count === null || count === undefined) {
            element.textContent = "";
            return;
        }

        element.textContent =
            count + (count === 1 ? " vacancy" : " vacancies");
    }

    /* ---------------------------------------------------------
       DATE AND PUBLICATION HELPERS
       --------------------------------------------------------- */

    function formatDate(value) {
        if (!value) {
            return "";
        }

        const raw = String(value).trim();
        let date;

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            date = new Date(raw + "T12:00:00Z");
        } else {
            date = new Date(raw);
        }

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC"
        }).format(date);
    }

    function isExpired(value) {
        if (!value) {
            return false;
        }

        const raw = String(value).trim();
        let timestamp;

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            timestamp = Date.parse(raw + "T23:59:59.999Z");
        } else {
            timestamp = Date.parse(raw);
        }

        if (Number.isNaN(timestamp)) {
            return false;
        }

        return Date.now() > timestamp;
    }

    function isPublished(job) {
        const status = getField(job, ["status", "publication_status"])
            .toLowerCase();

        if (job.published === false || job.is_published === false) {
            return false;
        }

        if (
            status &&
            !["published", "active", "open"].includes(status)
        ) {
            return false;
        }

        return true;
    }

    function getClosingDate(job) {
        return getField(job, [
            "closing_date",
            "closingDate",
            "application_deadline",
            "applicationDeadline",
            "deadline"
        ]);
    }

    /* ---------------------------------------------------------
       DESCRIPTION CONTENT
       --------------------------------------------------------- */

    function appendTextBlock(parent, text, className) {
        const value = normaliseText(text);

        if (!value) {
            return;
        }

        const paragraph = createElement(
            "p",
            className || "job-card__description-text",
            value
        );

        parent.appendChild(paragraph);
    }

    function appendListSection(parent, headingText, items) {
        if (!items || items.length === 0) {
            return;
        }

        const section = createElement("section", "job-card__section");
        const heading = createElement("h4", "job-card__section-title", headingText);
        const list = createElement("ul", "job-card__list");

        items.forEach(function (item) {
            const value = normaliseText(item);

            if (value) {
                list.appendChild(createElement("li", "", value));
            }
        });

        if (!list.childElementCount) {
            return;
        }

        section.append(heading, list);
        parent.appendChild(section);
    }

    function appendDescriptionSection(parent, headingText, text) {
        if (!text) {
            return;
        }

        const section = createElement("section", "job-card__section");
        section.appendChild(
            createElement("h4", "job-card__section-title", headingText)
        );
        appendTextBlock(section, text);
        parent.appendChild(section);
    }

    function getDescription(job) {
        return getField(job, [
            "description",
            "job_description",
            "jobDescription",
            "full_description",
            "fullDescription",
            "summary"
        ]);
    }

    function buildFullDescription(job) {
        const container = createElement(
            "div",
            "job-card__full-description"
        );

        const description = getDescription(job);

        appendDescriptionSection(
            container,
            "About the role",
            description
        );

        appendDescriptionSection(
            container,
            "Responsibilities",
            getField(job, [
                "responsibilities",
                "duties",
                "key_responsibilities"
            ])
        );

        appendListSection(
            container,
            "What you will do",
            getArrayField(job, [
                "responsibilities_list",
                "duties_list"
            ])
        );

        appendDescriptionSection(
            container,
            "Requirements",
            getField(job, [
                "requirements",
                "job_requirements",
                "candidate_requirements"
            ])
        );

        appendListSection(
            container,
            "Skills and qualifications",
            getArrayField(job, [
                "skills",
                "required_skills",
                "qualifications",
                "essential_skills"
            ])
        );

        appendDescriptionSection(
            container,
            "Experience",
            getField(job, [
                "experience",
                "experience_required"
            ])
        );

        appendDescriptionSection(
            container,
            "Benefits",
            getField(job, [
                "benefits",
                "perks"
            ])
        );

        appendDescriptionSection(
            container,
            "About the company",
            getField(job, [
                "company_description",
                "about_company"
            ])
        );

        /*
         * Display any extra description sections commonly returned
         * by job-management APIs, if present.
         */
        const extraSections = [
            {
                title: "Working hours",
                fields: ["working_hours", "hours"]
            },
            {
                title: "Contract duration",
                fields: ["contract_duration", "duration"]
            },
            {
                title: "Application instructions",
                fields: ["application_instructions", "how_to_apply"]
            }
        ];

        extraSections.forEach(function (section) {
            appendDescriptionSection(
                container,
                section.title,
                getField(job, section.fields)
            );
        });

        if (!container.childElementCount) {
            appendTextBlock(
                container,
                "Full job details are not available yet."
            );
        }

        return container;
    }

    /* ---------------------------------------------------------
       JOB CARD RENDERING
       --------------------------------------------------------- */

    function createJobCard(job, index) {
        const card = createElement("article", "job-card");
        card.dataset.jobIndex = String(index);

        const title = getField(
            job,
            ["title", "job_title", "jobTitle", "position", "name"],
            "Vacancy"
        );

        const location = getField(
            job,
            ["location", "job_location", "work_location"],
            ""
        );

        const employmentType = getField(
            job,
            [
                "employment_type",
                "employmentType",
                "job_type",
                "jobType",
                "type"
            ],
            ""
        );

        const department = getField(
            job,
            ["department", "team", "category"],
            ""
        );

        const salary = getField(
            job,
            ["salary_range", "salary", "salaryRange", "pay"],
            ""
        );

        const jobId = getField(
            job,
            ["id", "job_id", "jobId", "reference"],
            ""
        );

        const heading = createElement("h3", "job-card__title", title);
        card.appendChild(heading);

        if (jobId) {
            const reference = createElement(
                "p",
                "job-card__reference",
                "Reference: " + jobId
            );
            card.appendChild(reference);
        }

        const metadata = createElement("div", "job-card__metadata");

        [
            { label: "Location", value: location },
            { label: "Employment", value: employmentType },
            { label: "Department", value: department },
            { label: "Salary", value: salary }
        ].forEach(function (item) {
            if (!item.value) {
                return;
            }

            const detail = createElement("p", "job-card__detail");
            detail.append(
                createElement(
                    "strong",
                    "job-card__detail-label",
                    item.label + ": "
                ),
                createElement("span", "job-card__detail-value", item.value)
            );

            metadata.appendChild(detail);
        });

        if (metadata.childElementCount) {
            card.appendChild(metadata);
        }

        /*
         * Keep the card compact. The preview is shortened visually,
         * while the full description remains available below.
         */
        const description = getDescription(job);

        if (description) {
            const preview = createElement(
                "p",
                "job-card__description-preview",
                description
            );

            preview.classList.add("job-card__description--preview");
            card.appendChild(preview);
        }

        const details = createElement("details", "job-card__details");
        const summary = createElement(
            "summary",
            "job-card__details-toggle",
            "Read full description"
        );

        summary.setAttribute(
            "aria-label",
            "Read full description for " + title
        );

        details.appendChild(summary);
        details.appendChild(buildFullDescription(job));

        details.addEventListener("toggle", function () {
            summary.textContent = details.open
                ? "Show less"
                : "Read full description";
        });

        card.appendChild(details);

        const closingDate = getClosingDate(job);
        const formattedClosingDate = formatDate(closingDate);

        if (formattedClosingDate) {
            card.appendChild(
                createElement(
                    "p",
                    "job-card__deadline",
                    "Closing date: " + formattedClosingDate
                )
            );
        }

        const actions = createElement("div", "job-card__actions");

        const applyButton = createElement(
            "button",
            "button button-primary job-card__apply",
            "How to Apply"
        );

        applyButton.type = "button";
        applyButton.setAttribute(
            "aria-label",
            "View application information for " + title
        );

        applyButton.addEventListener("click", function () {
            const applicationSection =
                document.querySelector("#apply") ||
                document.querySelector("#application") ||
                document.querySelector("#careers-application") ||
                document.querySelector("[data-application-section]");

            const applicationForm = findElements(
                SELECTORS.applicationForms
            )[0];

            const target = applicationSection || applicationForm;

            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                const focusable = target.querySelector(
                    "input:not([type='hidden']), textarea, select, button"
                );

                if (focusable) {
                    window.setTimeout(function () {
                        focusable.focus({ preventScroll: true });
                    }, 300);
                }

                return;
            }

            const subject = encodeURIComponent(
                "Job enquiry: " + title +
                (jobId ? " (" + jobId + ")" : "")
            );

            showApplicationNotice(
                "To apply, email " + CONFIG.email +
                " and include the vacancy title" +
                (jobId ? " and reference " + jobId : "") +
                ". Online applications and CV uploads are not enabled yet."
            );

            /*
             * Do not open a blank or misleading application form.
             * The notice explains the current application process.
             */
        });

        actions.appendChild(applyButton);
        card.appendChild(actions);

        return card;
    }

    /* ---------------------------------------------------------
       APPLICATION NOTICE
       --------------------------------------------------------- */

    function showApplicationNotice(message) {
        let notice = document.querySelector(
            "[data-averra-application-notice]"
        );

        if (!notice) {
            notice = createElement("p", "application-status");
            notice.dataset.averraApplicationNotice = "true";
            notice.setAttribute("role", "status");
            notice.setAttribute("aria-live", "polite");

            const anchor =
                document.querySelector("#apply") ||
                document.querySelector("#application") ||
                document.querySelector("#careers-application") ||
                findElements(SELECTORS.applicationForms)[0];

            if (anchor && anchor.parentNode) {
                anchor.parentNode.insertBefore(notice, anchor);
            } else {
                const grid = findElement(SELECTORS.jobsGrid);

                if (grid) {
                    grid.after(notice);
                } else {
                    document.body.appendChild(notice);
                }
            }
        }

        notice.textContent = message;
        notice.hidden = false;
        notice.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    /* ---------------------------------------------------------
       PAGE STATES
       --------------------------------------------------------- */

    function showLoading() {
        const grid = findElement(SELECTORS.jobsGrid);

        setJobsCount(null);
        setStatus("Loading current vacancies…", "loading");

        if (grid) {
            grid.setAttribute("aria-busy", "true");
            grid.replaceChildren(
                createElement("p", "jobs-loading", "Loading vacancies…")
            );
        }
    }

    function showEmptyState() {
        const grid = findElement(SELECTORS.jobsGrid);

        setJobsCount(0);
        setStatus(
            "There are no current vacancies available. Please check again soon.",
            "empty"
        );

        if (grid) {
            grid.removeAttribute("aria-busy");
            grid.replaceChildren(
                createElement(
                    "p",
                    "jobs-empty",
                    "No vacancies are available at the moment. Please check back soon."
                )
            );
        }
    }

    function showErrorState(message) {
        const grid = findElement(SELECTORS.jobsGrid);

        setJobsCount(null);
        setStatus(message, "error");

        if (!grid) {
            return;
        }

        grid.removeAttribute("aria-busy");

        const errorContainer = createElement("div", "jobs-error");

        errorContainer.appendChild(
            createElement("p", "jobs-error__message", message)
        );

        const retryButton = createElement(
            "button",
            "button button-secondary jobs-error__retry",
            "Try Again"
        );

        retryButton.type = "button";
        retryButton.addEventListener("click", loadJobs);

        errorContainer.appendChild(retryButton);
        grid.replaceChildren(errorContainer);
    }

    /* ---------------------------------------------------------
       API RESPONSE NORMALISATION
       --------------------------------------------------------- */

    function extractJobs(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (data && typeof data === "object") {
            const possibleArrays = [
                data.jobs,
                data.items,
                data.results,
                data.data
            ];

            for (const value of possibleArrays) {
                if (Array.isArray(value)) {
                    return value;
                }
            }
        }

        throw new Error(
            "The jobs service returned an unexpected response format."
        );
    }

    function filterCurrentJobs(jobs) {
        return jobs.filter(function (job) {
            if (!job || typeof job !== "object") {
                return false;
            }

            if (!isPublished(job)) {
                return false;
            }

            return !isExpired(getClosingDate(job));
        });
    }

    function renderJobs(jobs) {
        const grid = findElement(SELECTORS.jobsGrid);

        if (!grid) {
            console.warn("[AVERRA jobs] Jobs grid not found.");
            return;
        }

        const currentJobs = filterCurrentJobs(jobs);

        lastJobs = currentJobs;
        lastError = null;

        grid.removeAttribute("aria-busy");

        const fallbackStatus = grid.querySelector(
            "[data-jobs-fallback-status]"
        );

        if (fallbackStatus) {
            fallbackStatus.remove();
        }

        if (currentJobs.length === 0) {
            showEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();

        currentJobs.forEach(function (job, index) {
            fragment.appendChild(createJobCard(job, index));
        });

        grid.replaceChildren(fragment);

        setJobsCount(currentJobs.length);
        setStatus("", "success");

        console.info(
            "[AVERRA jobs] Displayed " +
            currentJobs.length +
            " current vacancy/vacancies."
        );
    }

    /* ---------------------------------------------------------
       LOAD VACANCIES
       --------------------------------------------------------- */

    async function loadJobs() {
        const grid = findElement(SELECTORS.jobsGrid);

        if (!grid) {
            console.warn(
                "[AVERRA jobs] No jobs grid found. Check the careers HTML."
            );
            return;
        }

        /*
         * A new request supersedes the previous request.
         * This also allows the retry button to work during loading.
         */
        if (activeController) {
            activeController.abort();
        }

        const thisRequest = ++requestNumber;
        const controller = new AbortController();

        activeController = controller;
        loading = true;

        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, CONFIG.requestTimeoutMs);

        showLoading();

        try {
            const response = await fetch(buildJobsUrl(), {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                cache: "no-store",
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(
                    "The jobs service returned HTTP " + response.status + "."
                );
            }

            const data = await response.json();

            /*
             * Ignore results from a request that has been replaced.
             */
            if (thisRequest !== requestNumber) {
                return;
            }

            renderJobs(extractJobs(data));
        } catch (error) {
            if (thisRequest !== requestNumber) {
                return;
            }

            lastError = error;

            if (error && error.name === "AbortError") {
                console.warn("[AVERRA jobs] Request timed out or was cancelled.");

                showErrorState(
                    "The vacancy service did not respond in time. " +
                    "Please try again."
                );
            } else {
                console.error(
                    "[AVERRA jobs] Failed to load vacancies:",
                    error
                );

                showErrorState(
                    "We could not load vacancies right now. Please try again " +
                    "shortly or contact " + CONFIG.email + "."
                );
            }
        } finally {
            window.clearTimeout(timeoutId);

            if (thisRequest === requestNumber) {
                loading = false;
                activeController = null;
            }
        }
    }

    /* ---------------------------------------------------------
       EXISTING PAGE INTEGRATIONS
       --------------------------------------------------------- */

    function setupRetryControls() {
        findElements(SELECTORS.retryButton).forEach(function (button) {
            if (button.dataset.averraRetryHandler === "true") {
                return;
            }

            button.dataset.averraRetryHandler = "true";

            button.addEventListener("click", function (event) {
                event.preventDefault();
                loadJobs();
            });
        });
    }

    function setupApplicationForms() {
        findElements(SELECTORS.applicationForms).forEach(function (form) {
            if (form.dataset.averraApplicationHandler === "true") {
                return;
            }

            form.dataset.averraApplicationHandler = "true";

            form.addEventListener("submit", function (event) {
                event.preventDefault();

                showApplicationNotice(
                    "Online job applications and CV uploads are not enabled " +
                    "yet. Please email " + CONFIG.email +
                    " with the vacancy title and your CV. Do not send " +
                    "sensitive personal information through an unverified form."
                );
            });
        });
    }

    function setupMobileNavigation() {
        const menuButton =
            document.querySelector("#menu-toggle") ||
            document.querySelector("#mobile-menu-toggle") ||
            document.querySelector("#nav-toggle") ||
            document.querySelector("[data-menu-toggle]");

        const navigation =
            document.querySelector("#main-navigation") ||
            document.querySelector("#main-nav") ||
            document.querySelector(".main-navigation") ||
            document.querySelector("[data-main-navigation]");

        if (!menuButton || !navigation) {
            return;
        }

        if (menuButton.dataset.averraMenuHandler === "true") {
            return;
        }

        menuButton.dataset.averraMenuHandler = "true";
        menuButton.setAttribute("aria-expanded", "false");

        menuButton.addEventListener("click", function () {
            const expanded =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute("aria-expanded", String(!expanded));
            navigation.classList.toggle("is-open", !expanded);
            navigation.classList.toggle("active", !expanded);
            menuButton.classList.toggle("is-active", !expanded);
        });

        navigation.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                menuButton.setAttribute("aria-expanded", "false");
                navigation.classList.remove("is-open", "active");
                menuButton.classList.remove("is-active");
            });
        });
    }

    /* ---------------------------------------------------------
       INITIALISATION AND PUBLIC API
       --------------------------------------------------------- */

    function init() {
        console.info(
            "[AVERRA jobs] Version " + VERSION + " initialising."
        );

        setupRetryControls();
        setupApplicationForms();
        setupMobileNavigation();

        if (findElement(SELECTORS.jobsGrid)) {
            loadJobs();
        } else {
            console.info(
                "[AVERRA jobs] No jobs grid on this page; loading skipped."
            );
        }
    }

    window.AVERRAJobs = {
        version: VERSION,
        load: loadJobs,

        getLastJobs: function () {
            return lastJobs.slice();
        },

        getLastError: function () {
            return lastError;
        },

        getApiBaseUrl: function () {
            return API_BASE_URL;
        },

        isLoading: function () {
            return loading;
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
            once: true
        });
    } else {
        init();
    }
})();
