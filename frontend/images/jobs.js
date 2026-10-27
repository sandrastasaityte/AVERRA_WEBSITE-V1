
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   JOBS PAGE MANAGEMENT
   File: frontend/images/jobs.js
   Version: 5.0.0

   FEATURES
   - Loads vacancies from the AVERRA Render API
   - Supports multiple API response formats
   - Displays published, non-expired jobs
   - Safely renders vacancy information
   - Supports descriptions returned as arrays
   - Lets applicants select a vacancy and reach the application form
   - Leaves application submission to applications.js
   - Supports retrying failed requests
   - Preserves common existing page selectors
   ============================================================ */

(function () {
    "use strict";

    const CONFIG = {
        apiBaseUrl:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        jobsEndpoint: "/api/jobs",
        requestTimeout: 20000,
        jobsLimit: 100,
        contactEmail: "info@averrastaffing.co.uk"
    };

    /*
     * Share the API address with applications.js.
     * An explicitly configured AVERRA_API_BASE_URL always takes priority.
     */
    window.AVERRA_API_BASE_URL =
        window.AVERRA_API_BASE_URL || CONFIG.apiBaseUrl;

    const state = {
        jobs: [],
        loading: false,
        loaded: false,
        error: null
    };

    const SELECTORS = {
        jobsContainers: [
            "#jobs-grid",
            "#job-listings",
            "#jobs-container",
            "[data-jobs-grid]"
        ],

        jobCounts: [
            "#jobs-count",
            "#job-count",
            "[data-jobs-count]"
        ],

        statusMessages: [
            "#jobs-status",
            "#job-status",
            "[data-jobs-status]"
        ],

        retryButtons: [
            "#retry-jobs",
            "#jobs-retry",
            "[data-retry-jobs]"
        ],

        applicationForms: [
            "#cv-application-form",
            "#application-form",
            "form[data-application-form]"
        ],

        jobSelects: [
            "#job_id",
            "#job-title",
            "#job",
            'select[name="job_id"]',
            'select[name="job_title"]',
            'select[name="position"]',
            "[data-job-select]"
        ]
    };

    function queryFirst(selectors, root) {
        const scope = root || document;

        for (const selector of selectors) {
            const element = scope.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function queryAllUnique(selectors, root) {
        const scope = root || document;
        const elements = [];

        selectors.forEach(function (selector) {
            scope.querySelectorAll(selector).forEach(function (element) {
                if (!elements.includes(element)) {
                    elements.push(element);
                }
            });
        });

        return elements;
    }

    function normaliseText(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (Array.isArray(value)) {
            return value
                .map(normaliseText)
                .filter(Boolean)
                .join("\n");
        }

        if (typeof value === "object") {
            if (typeof value.text === "string") {
                return value.text.trim();
            }

            if (typeof value.name === "string") {
                return value.name.trim();
            }

            return "";
        }

        return String(value).trim();
    }

    function getJobId(job) {
        return normaliseText(
            job.id !== undefined ? job.id :
            job.job_id !== undefined ? job.job_id :
            job.uuid
        );
    }

    function getJobTitle(job) {
        return normaliseText(
            job.title ||
            job.job_title ||
            job.position ||
            job.name ||
            "Vacancy"
        );
    }

    function getJobDescription(job) {
        return normaliseText(
            job.description ||
            job.job_description ||
            job.summary ||
            job.details
        );
    }

    function getJobLocation(job) {
        return normaliseText(
            job.location ||
            job.work_location ||
            job.location_type
        );
    }

    function getJobType(job) {
        return normaliseText(
            job.employment_type ||
            job.job_type ||
            job.type ||
            job.contract_type
        );
    }

    function getJobSalary(job) {
        return normaliseText(
            job.salary ||
            job.salary_range ||
            job.pay_range
        );
    }

    function getJobDepartment(job) {
        return normaliseText(
            job.department ||
            job.category ||
            job.team
        );
    }

    function getClosingDate(job) {
        return normaliseText(
            job.closing_date ||
            job.application_deadline ||
            job.deadline
        );
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    function isExpired(job) {
        const closingDate = parseDate(getClosingDate(job));

        if (!closingDate) {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        closingDate.setHours(0, 0, 0, 0);

        return closingDate < today;
    }

    function isPublished(job) {
        if (!job || typeof job !== "object") {
            return false;
        }

        if (
            job.is_published === false ||
            job.published === false ||
            job.is_active === false ||
            job.active === false
        ) {
            return false;
        }

        const status = normaliseText(job.status).toLowerCase();

        /*
         * Do not display jobs explicitly marked as drafts,
         * archived, closed, unpublished or otherwise inactive.
         *
         * If the API omits status, the job can still be displayed
         * unless another field explicitly marks it unpublished.
         */
        const blockedStatuses = [
            "draft",
            "archived",
            "closed",
            "unpublished",
            "inactive",
            "deleted",
            "cancelled",
            "canceled"
        ];

        if (blockedStatuses.includes(status)) {
            return false;
        }

        if (
            status &&
            !["published", "active", "open", "live"].includes(status)
        ) {
            return false;
        }

        return !isExpired(job);
    }

    function extractJobs(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (!payload || typeof payload !== "object") {
            return [];
        }

        const possibleArrays = [
            payload.jobs,
            payload.results,
            payload.data,
            payload.items,
            payload.vacancies
        ];

        for (const item of possibleArrays) {
            if (Array.isArray(item)) {
                return item;
            }

            if (item && typeof item === "object") {
                if (Array.isArray(item.jobs)) {
                    return item.jobs;
                }

                if (Array.isArray(item.results)) {
                    return item.results;
                }

                if (Array.isArray(item.items)) {
                    return item.items;
                }
            }
        }

        return [];
    }

    function makeUrl(path) {
        const base = CONFIG.apiBaseUrl.replace(/\/+$/, "");
        const endpoint = path.startsWith("/") ? path : "/" + path;

        return base + endpoint;
    }

    async function apiRequest(path, options) {
        const controller = new AbortController();

        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, CONFIG.requestTimeout);

        try {
            const response = await fetch(makeUrl(path), {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                signal: controller.signal,
                ...(options || {})
            });

            const responseText = await response.text();
            let payload = null;

            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch (error) {
                    payload = responseText;
                }
            }

            if (!response.ok) {
                const detail =
                    payload &&
                    typeof payload === "object" &&
                    (payload.detail || payload.message || payload.error);

                throw new Error(
                    detail ||
                    "The jobs service returned HTTP " + response.status + "."
                );
            }

            return payload;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "The jobs request timed out. Please try again."
                );
            }

            if (
                error instanceof TypeError &&
                /fetch/i.test(error.message)
            ) {
                throw new Error(
                    "Unable to connect to the jobs service. Please check your connection and try again."
                );
            }

            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function formatDate(value) {
        const date = parseDate(value);

        if (!date) {
            return value || "";
        }

        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        return element;
    }

    function appendMetadata(card, label, value) {
        if (!value) {
            return;
        }

        const item = createElement("p", "job-meta-item");
        const strong = createElement("strong", "", label + ": ");

        item.appendChild(strong);
        item.appendChild(document.createTextNode(value));
        card.appendChild(item);
    }

    function createJobCard(job) {
        const jobId = getJobId(job);
        const title = getJobTitle(job);
        const description = getJobDescription(job);
        const location = getJobLocation(job);
        const jobType = getJobType(job);
        const salary = getJobSalary(job);
        const department = getJobDepartment(job);
        const closingDate = getClosingDate(job);

        const card = createElement("article", "job-card");

        if (jobId) {
            card.dataset.jobId = jobId;
        }

        const heading = createElement("h3", "job-title", title);
        card.appendChild(heading);

        const metadata = createElement("div", "job-meta");

        if (location) {
            metadata.appendChild(
                createElement("span", "job-location", location)
            );
        }

        if (jobType) {
            metadata.appendChild(
                createElement("span", "job-type", jobType)
            );
        }

        if (metadata.childElementCount > 0) {
            card.appendChild(metadata);
        }

        appendMetadata(card, "Department", department);
        appendMetadata(card, "Salary", salary);

        if (description) {
            const descriptionElement = createElement(
                "p",
                "job-description",
                description
            );

            card.appendChild(descriptionElement);
        }

        if (closingDate) {
            const deadline = createElement(
                "p",
                "job-closing-date",
                "Application deadline: " + formatDate(closingDate)
            );

            card.appendChild(deadline);
        }

        const actions = createElement("div", "job-actions");
        const applyButton = createElement(
            "button",
            "job-apply-button",
            "How to Apply"
        );

        applyButton.type = "button";
        applyButton.dataset.jobApply = "true";

        if (jobId) {
            applyButton.dataset.jobId = jobId;
        }

        applyButton.dataset.jobTitle = title;

        applyButton.addEventListener("click", function () {
            selectJobForApplication(job);
        });

        actions.appendChild(applyButton);
        card.appendChild(actions);

        return card;
    }

    function setStatus(message, type) {
        const statusElement = queryFirst(SELECTORS.statusMessages);

        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.dataset.statusType = type || "info";
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
    }

    function updateJobCount(count) {
        const countElement = queryFirst(SELECTORS.jobCounts);

        if (!countElement) {
            return;
        }

        countElement.textContent =
            count + (count === 1 ? " vacancy available" : " vacancies available");
    }

    function showError(message) {
        const container = queryFirst(SELECTORS.jobsContainers);

        setStatus(message, "error");

        if (container) {
            container.replaceChildren();

            const errorMessage = createElement(
                "p",
                "jobs-error",
                message
            );

            container.appendChild(errorMessage);
        }

        updateJobCount(0);
    }

    function renderJobs(jobs) {
        const containers = queryAllUnique(SELECTORS.jobsContainers);

        if (containers.length === 0) {
            console.warn(
                "AVERRA Jobs: no jobs container was found. Expected #jobs-grid or a supported alternative."
            );
            return;
        }

        const validJobs = jobs.filter(isPublished);

        containers.forEach(function (container) {
            container.replaceChildren();

            if (validJobs.length === 0) {
                const emptyMessage = createElement(
                    "p",
                    "jobs-empty",
                    "There are currently no vacancies available. Please check again soon."
                );

                container.appendChild(emptyMessage);
                return;
            }

            validJobs.forEach(function (job) {
                container.appendChild(createJobCard(job));
            });
        });

        updateJobCount(validJobs.length);

        if (validJobs.length === 0) {
            setStatus("There are currently no vacancies available.", "empty");
        } else {
            setStatus(
                "Loaded " + validJobs.length +
                (validJobs.length === 1 ? " vacancy." : " vacancies."),
                "success"
            );
        }
    }

    function getApplicationForm() {
        return queryFirst(SELECTORS.applicationForms);
    }

    function selectJobForApplication(job) {
        const form = getApplicationForm();

        if (!form) {
            setStatus(
                "To apply, email " + CONFIG.contactEmail +
                " and include the job title: " + getJobTitle(job) + ".",
                "info"
            );

            return;
        }

        const jobId = getJobId(job);
        const jobTitle = getJobTitle(job);
        const selects = queryAllUnique(SELECTORS.jobSelects, form);

        let selectionMade = false;

        selects.forEach(function (select) {
            if (select.tagName !== "SELECT") {
                return;
            }

            const options = Array.from(select.options);

            let matchingOption = options.find(function (option) {
                return (
                    (jobId && option.value === jobId) ||
                    option.textContent.trim() === jobTitle
                );
            });

            if (!matchingOption) {
                matchingOption = options.find(function (option) {
                    return (
                        option.value.trim().toLowerCase() ===
                        jobTitle.trim().toLowerCase()
                    );
                });
            }

            if (matchingOption) {
                select.value = matchingOption.value;
                select.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
                selectionMade = true;
            }
        });

        /*
         * Support a hidden or text-based job field if the page uses one.
         */
        const hiddenJobId = form.querySelector(
            'input[name="job_id"]'
        );

        if (hiddenJobId && hiddenJobId.type !== "file") {
            hiddenJobId.value = jobId || "general";
            hiddenJobId.dispatchEvent(
                new Event("change", { bubbles: true })
            );
            selectionMade = true;
        }

        const hiddenJobTitle = form.querySelector(
            'input[name="job_title"]'
        );

        if (hiddenJobTitle && hiddenJobTitle.type !== "file") {
            hiddenJobTitle.value = jobTitle;
            hiddenJobTitle.dispatchEvent(
                new Event("change", { bubbles: true })
            );
            selectionMade = true;
        }

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        if (selectionMade) {
            setStatus(
                "Selected vacancy: " + jobTitle + ". Complete the application form below.",
                "info"
            );
        }

        const firstField = form.querySelector(
            'input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );

        if (firstField) {
            window.setTimeout(function () {
                firstField.focus({ preventScroll: true });
            }, 350);
        }
    }

    async function loadJobs() {
        if (state.loading) {
            return;
        }

        state.loading = true;
        state.error = null;

        setStatus("Loading current vacancies…", "loading");

        const retryButtons = queryAllUnique(SELECTORS.retryButtons);

        retryButtons.forEach(function (button) {
            button.disabled = true;
        });

        try {
            const payload = await apiRequest(
                CONFIG.jobsEndpoint + "?limit=" + CONFIG.jobsLimit
            );

            const jobs = extractJobs(payload);

            state.jobs = jobs;
            state.loaded = true;

            renderJobs(jobs);
        } catch (error) {
            state.error = error.message || "Unable to load vacancies.";

            console.error("AVERRA Jobs: failed to load vacancies.", error);

            showError(
                "We couldn't load the vacancies right now. Please try again shortly."
            );
        } finally {
            state.loading = false;

            retryButtons.forEach(function (button) {
                button.disabled = false;
            });
        }
    }

    function setupRetryButtons() {
        const retryButtons = queryAllUnique(SELECTORS.retryButtons);

        retryButtons.forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                loadJobs();
            });
        });
    }

    /*
     * IMPORTANT:
     * This file intentionally does not add a submit handler to application
     * forms. The application form submission belongs to applications.js.
     * This prevents the jobs page from blocking CV uploads or API requests.
     */
    function setupApplicationForms() {
        const forms = queryAllUnique(SELECTORS.applicationForms);

        forms.forEach(function (form) {
            form.dataset.averrraApplicationFormDetected = "true";
        });
    }

    function setupMobileNavigation() {
        const menuButton = document.querySelector(
            "#menu-toggle, #mobile-menu-toggle, [data-menu-toggle]"
        );

        const navigation = document.querySelector(
            "#main-navigation, #main-nav, [data-main-navigation]"
        );

        if (!menuButton || !navigation) {
            return;
        }

        if (menuButton.dataset.averraJobsNavigationReady === "true") {
            return;
        }

        menuButton.dataset.averraJobsNavigationReady = "true";

        menuButton.addEventListener("click", function () {
            const isExpanded =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute(
                "aria-expanded",
                String(!isExpanded)
            );

            navigation.classList.toggle("is-open", !isExpanded);
            navigation.classList.toggle("active", !isExpanded);
        });
    }

    function initialise() {
        setupRetryButtons();
        setupApplicationForms();
        setupMobileNavigation();
        loadJobs();
    }

    window.AVERRAJobs = {
        load: loadJobs,

        getJobs: function () {
            return state.jobs.slice();
        },

        getStatus: function () {
            return {
                loading: state.loading,
                loaded: state.loaded,
                error: state.error,
                count: state.jobs.filter(isPublished).length
            };
        },

        selectJobForApplication: selectJobForApplication
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise, {
            once: true
        });
    } else {
        initialise();
    }
})();
