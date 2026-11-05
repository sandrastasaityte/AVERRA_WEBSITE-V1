
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   JOBS PAGE MANAGEMENT
   File: frontend/images/jobs.js
   Version: 5.7.0

   FEATURES
   - Loads vacancies from the AVERRA API
   - Supports common API response formats
   - Displays published and non-expired vacancies
   - Populates application vacancy dropdown
   - Supports general applications
   - Supports vacancy search
   - Supports category filtering
   - Reset button clears filters
   - Apply buttons select the correct vacancy
   - Loading, success, empty and error messages
   - Retry support
   - Safe DOM rendering using textContent
   - Expandable job descriptions (Read more / Show less)
   - Does not override application submission
   - Does not override mobile navigation
   - Does not initialise on pages without a jobs container
   ============================================================ */

(function (window, document) {
    "use strict";

    const VERSION = "5.7.0";

    if (
        window.AVERRAJobs &&
        window.AVERRAJobs.version === VERSION
    ) {
        return;
    }

    const CONFIG = Object.freeze({
        apiBaseUrl:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        jobsEndpoint: "/api/jobs",
        requestTimeout: 20000,
        jobsLimit: 100,
        contactEmail: "enquiries@averrastaffing.co.uk",

        // Description expansion settings
        descriptionMaxLength: 350,
        descriptionCollapsedHeight: "160px"
    });

    window.AVERRA_API_BASE_URL =
        window.AVERRA_API_BASE_URL || CONFIG.apiBaseUrl;

    const state = {
        jobs: [],
        loading: false,
        loaded: false,
        error: null,
        requestNumber: 0,
        initialised: false,
        descriptionCounter: 0
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
            "#jobs-results-count",
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

        resetButtons: [
            "#reset-jobs"
        ],

        applicationForms: [
            "#cv-application-form",
            "#application-form",
            "form[data-application-form]"
        ],

        jobSelects: [
            "#applicant-role",
            "#job_id",
            "#job-title",
            "#job",
            'select[name="job_id"]',
            'select[name="job_title"]',
            'select[name="position"]',
            "[data-job-select]"
        ],

        searchInputs: [
            "#job-search",
            "#jobs-search",
            "[data-job-search]"
        ],

        categoryFilters: [
            "#job-category-filter",
            "#jobs-category-filter",
            "[data-job-category-filter]"
        ]
    };

    /* --------------------------------------------------------
       DOM HELPERS
       -------------------------------------------------------- */

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

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
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

    function getErrorMessage(error, fallback) {
        if (
            error &&
            typeof error.message === "string" &&
            error.message.trim()
        ) {
            return error.message.trim();
        }

        return fallback;
    }

    /* --------------------------------------------------------
       JOB FIELD HELPERS
       -------------------------------------------------------- */

    function getJobId(job) {
        if (!job || typeof job !== "object") {
            return "";
        }

        return normaliseText(
            job.id !== undefined && job.id !== null
                ? job.id
                : job.job_id !== undefined && job.job_id !== null
                    ? job.job_id
                    : job.uuid
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

    function getJobCategory(job) {
        return normaliseText(
            job.category ||
            job.department ||
            job.team ||
            job.job_category
        );
    }

    function getClosingDate(job) {
        return normaliseText(
            job.closing_date ||
            job.application_deadline ||
            job.deadline
        );
    }

    /* --------------------------------------------------------
       CATEGORY NORMALISATION
       -------------------------------------------------------- */

    function normaliseCategory(value) {
        return normaliseText(value)
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "");
    }

    function getCategoryAliases(value) {
        const category = normaliseCategory(value);

        const aliases = {
            finance: [
                "finance",
                "accounting",
                "financeaccounting"
            ],

            technology: [
                "technology",
                "it",
                "software",
                "softwaredevelopment",
                "itsoftwaredevelopment"
            ],

            architecture: [
                "architecture",
                "design",
                "architecturedesign"
            ],

            engineering: [
                "engineering",
                "technical",
                "engineeringtechnical"
            ],

            administration: [
                "administration",
                "dataentry",
                "administrationdataentry"
            ],

            customerservice: [
                "customerservice",
                "support",
                "customerservicesupport"
            ],

            sales: [
                "sales",
                "businessdevelopment",
                "salesbusinessdevelopment"
            ],

            marketing: [
                "marketing",
                "digitalmarketing"
            ],

            humanresources: [
                "humanresources",
                "recruitment",
                "humanresourcesrecruitment"
            ],

            operations: [
                "operations",
                "businessoperations"
            ],

            projectmanagement: [
                "projectmanagement"
            ],

            legal: [
                "legal",
                "compliance",
                "legalcompliancesupport"
            ],

            procurement: [
                "procurement",
                "supplychain",
                "procurementsupplychain"
            ],

            research: [
                "research",
                "dataanalysis",
                "researchdataanalysis"
            ],

            healthcare: [
                "healthcare",
                "healthcareadministration"
            ],

            other: [
                "other",
                "otherprofessionalroles"
            ]
        };

        for (const key of Object.keys(aliases)) {
            if (aliases[key].includes(category)) {
                return aliases[key];
            }
        }

        return [category];
    }

    function categoriesMatch(jobCategory, selectedCategory) {
        if (!selectedCategory) {
            return true;
        }

        const jobAliases = getCategoryAliases(jobCategory);
        const selectedAliases = getCategoryAliases(selectedCategory);

        return jobAliases.some(function (alias) {
            return selectedAliases.includes(alias);
        });
    }

    /* --------------------------------------------------------
       DATE HANDLING
       -------------------------------------------------------- */

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const text = normaliseText(value);

        if (!text) {
            return null;
        }

        const dateOnlyMatch = text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const month = Number(dateOnlyMatch[2]);
            const day = Number(dateOnlyMatch[3]);

            const date = new Date(year, month - 1, day);

            if (
                date.getFullYear() !== year ||
                date.getMonth() !== month - 1 ||
                date.getDate() !== day
            ) {
                return null;
            }

            return date;
        }

        const parsed = new Date(text);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    }

    function isExpired(job) {
        const closingDateText = getClosingDate(job);

        if (!closingDateText) {
            return false;
        }

        const closingDate = parseDate(closingDateText);

        if (!closingDate) {
            return true;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        closingDate.setHours(0, 0, 0, 0);

        return closingDate.getTime() < today.getTime();
    }

    function formatDate(value) {
        const date = parseDate(value);

        if (!date) {
            return normaliseText(value);
        }

        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    /* --------------------------------------------------------
       PUBLICATION STATUS
       -------------------------------------------------------- */

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

    /* --------------------------------------------------------
       API RESPONSE NORMALISATION
       -------------------------------------------------------- */

    function extractJobs(payload) {
        if (Array.isArray(payload)) {
            return payload.filter(function (item) {
                return item && typeof item === "object";
            });
        }

        if (!payload || typeof payload !== "object") {
            return null;
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
                return item.filter(function (job) {
                    return job && typeof job === "object";
                });
            }

            if (item && typeof item === "object") {
                const nestedArrays = [
                    item.jobs,
                    item.results,
                    item.items,
                    item.vacancies
                ];

                for (const nested of nestedArrays) {
                    if (Array.isArray(nested)) {
                        return nested.filter(function (job) {
                            return job && typeof job === "object";
                        });
                    }
                }
            }
        }

        return null;
    }

    function makeUrl(path) {
        const base = CONFIG.apiBaseUrl.replace(/\/+$/, "");

        const endpoint = path.startsWith("/")
            ? path
            : "/" + path;

        return base + endpoint;
    }

    /* --------------------------------------------------------
       API REQUEST
       -------------------------------------------------------- */

    async function apiRequest(path) {
        const controller = new window.AbortController();

        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, CONFIG.requestTimeout);

        try {
            const response = await window.fetch(makeUrl(path), {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                signal: controller.signal,
                credentials: "omit"
            });

            const responseText = await response.text();

            let payload = null;

            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch {
                    payload = responseText;
                }
            }

            if (!response.ok) {
                let detail = "";

                if (payload && typeof payload === "object") {
                    detail = normaliseText(
                        payload.detail ||
                        payload.message ||
                        payload.error
                    );
                } else if (typeof payload === "string") {
                    detail = payload.trim();
                }

                throw new Error(
                    detail ||
                    "The jobs service returned HTTP " +
                    response.status + "."
                );
            }

            return payload;

        } catch (error) {
            if (error && error.name === "AbortError") {
                throw new Error(
                    "The jobs request timed out. Please try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the jobs service. " +
                    "Please check your connection and try again."
                );
            }

            throw error;

        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    /* --------------------------------------------------------
       STATUS AND COUNTS
       -------------------------------------------------------- */

    function setStatus(message, type) {
        const statusElement = queryFirst(
            SELECTORS.statusMessages
        );

        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.dataset.statusType = type || "info";

        statusElement.classList.remove(
            "info",
            "success",
            "error"
        );

        if (["info", "success", "error"].includes(type)) {
            statusElement.classList.add(type);
        }

        statusElement.hidden = !message;

        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
    }

    function updateJobCount(count) {
        const countElement = queryFirst(
            SELECTORS.jobCounts
        );

        if (!countElement) {
            return;
        }

        countElement.textContent =
            count +
            (count === 1
                ? " vacancy available"
                : " vacancies available");
    }

    function showError(message) {
        const containers = queryAllUnique(
            SELECTORS.jobsContainers
        );

        setStatus(message, "error");

        containers.forEach(function (container) {
            container.replaceChildren();

            const errorElement = createElement(
                "p",
                "jobs-empty",
                message
            );

            container.appendChild(errorElement);
            container.setAttribute("aria-busy", "false");
        });

        updateJobCount(0);
    }

    /* --------------------------------------------------------
       APPLICATION DROPDOWN
       -------------------------------------------------------- */

    function populateJobSelects() {
        const selects = queryAllUnique(
            SELECTORS.jobSelects
        );

        const publishedJobs = state.jobs.filter(isPublished);

        selects.forEach(function (select) {
            if (select.tagName !== "SELECT") {
                return;
            }

            const previousValue = select.value;

            select.replaceChildren();

            const placeholder = createElement(
                "option",
                "",
                "Select a vacancy"
            );

            placeholder.value = "";
            select.appendChild(placeholder);

            const generalOption = createElement(
                "option",
                "",
                "General Application"
            );

            generalOption.value = "general";
            select.appendChild(generalOption);

            publishedJobs.forEach(function (job) {
                const jobId = getJobId(job);
                const jobTitle = getJobTitle(job);

                if (!jobId) {
                    return;
                }

                const option = createElement(
                    "option",
                    "",
                    jobTitle
                );

                option.value = jobId;
                option.dataset.jobTitle = jobTitle;

                select.appendChild(option);
            });

            const hasPreviousValue = Array.from(
                select.options
            ).some(function (option) {
                return option.value === previousValue;
            });

            if (hasPreviousValue) {
                select.value = previousValue;
            } else {
                select.value = "";
            }

            select.dispatchEvent(
                new window.Event("change", {
                    bubbles: true
                })
            );
        });
    }

    /* --------------------------------------------------------
       EXPANDABLE JOB DESCRIPTION
       -------------------------------------------------------- */

    function createJobDescription(description) {
        const wrapper = createElement(
            "div",
            "job-description-wrapper"
        );

        const descriptionElement = createElement(
            "p",
            "job-description",
            description
        );

        /*
         * Keep descriptions with modest length fully visible.
         * Long descriptions receive a Read more control.
         */
        if (
            description.length <=
            CONFIG.descriptionMaxLength
        ) {
            wrapper.appendChild(descriptionElement);
            return wrapper;
        }

        state.descriptionCounter += 1;

        const descriptionId =
            "averra-job-description-" +
            state.descriptionCounter;

        descriptionElement.id = descriptionId;

        descriptionElement.style.maxHeight =
            CONFIG.descriptionCollapsedHeight;

        descriptionElement.style.overflow = "hidden";

        descriptionElement.style.position = "relative";

        descriptionElement.style.whiteSpace = "pre-line";

        descriptionElement.setAttribute(
            "aria-expanded",
            "false"
        );

        const toggleButton = createElement(
            "button",
            "job-description-toggle",
            "Read full description"
        );

        toggleButton.type = "button";

        toggleButton.setAttribute(
            "aria-controls",
            descriptionId
        );

        toggleButton.setAttribute(
            "aria-expanded",
            "false"
        );

        toggleButton.style.display = "inline-block";
        toggleButton.style.marginTop = "8px";
        toggleButton.style.cursor = "pointer";

        toggleButton.addEventListener(
            "click",
            function () {
                const isExpanded =
                    toggleButton.getAttribute(
                        "aria-expanded"
                    ) === "true";

                if (isExpanded) {
                    descriptionElement.style.maxHeight =
                        CONFIG.descriptionCollapsedHeight;

                    descriptionElement.style.overflow =
                        "hidden";

                    descriptionElement.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    toggleButton.textContent =
                        "Read full description";

                    toggleButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                } else {
                    descriptionElement.style.maxHeight =
                        "none";

                    descriptionElement.style.overflow =
                        "visible";

                    descriptionElement.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                    toggleButton.textContent =
                        "Show less";

                    toggleButton.setAttribute(
                        "aria-expanded",
                        "true"
                    );
                }
            }
        );

        wrapper.appendChild(descriptionElement);
        wrapper.appendChild(toggleButton);

        return wrapper;
    }

    /* --------------------------------------------------------
       JOB CARD RENDERING
       -------------------------------------------------------- */

    function appendMetadata(card, label, value) {
        if (!value) {
            return;
        }

        const item = createElement(
            "p",
            "job-meta-item"
        );

        item.appendChild(
            createElement("strong", "", label + ": ")
        );

        item.appendChild(
            document.createTextNode(value)
        );

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
        const category = getJobCategory(job);

        const card = createElement(
            "article",
            "job-card"
        );

        if (jobId) {
            card.dataset.jobId = jobId;
        }

        if (category) {
            card.appendChild(
                createElement(
                    "span",
                    "job-category",
                    category
                )
            );
        }

        card.appendChild(
            createElement(
                "h3",
                "job-title",
                title
            )
        );

        const metadata = createElement(
            "div",
            "job-meta"
        );

        if (location) {
            metadata.appendChild(
                createElement(
                    "span",
                    "job-location",
                    location
                )
            );
        }

        if (jobType) {
            metadata.appendChild(
                createElement(
                    "span",
                    "job-type",
                    jobType
                )
            );
        }

        if (metadata.childElementCount > 0) {
            card.appendChild(metadata);
        }

        appendMetadata(card, "Department", department);
        appendMetadata(card, "Salary", salary);

        if (description) {
            card.appendChild(
                createJobDescription(description)
            );
        }

        if (closingDate) {
            card.appendChild(
                createElement(
                    "p",
                    "job-closing-date",
                    "Application deadline: " +
                    formatDate(closingDate)
                )
            );
        }

        const actions = createElement(
            "div",
            "job-actions"
        );

        const applyButton = createElement(
            "button",
            "jobs-button jobs-button-gold",
            "Apply for this role"
        );

        applyButton.type = "button";
        applyButton.dataset.jobApply = "true";

        applyButton.setAttribute(
            "aria-label",
            "Apply for " + title
        );

        applyButton.dataset.jobId = jobId;
        applyButton.dataset.jobTitle = title;

        applyButton.addEventListener("click", function () {
            selectJobForApplication(job);
        });

        actions.appendChild(applyButton);
        card.appendChild(actions);

        return card;
    }

    /* --------------------------------------------------------
       SEARCH AND CATEGORY FILTERS
       -------------------------------------------------------- */

    function getFilteredJobs() {
        const searchInput = queryFirst(
            SELECTORS.searchInputs
        );

        const categoryFilter = queryFirst(
            SELECTORS.categoryFilters
        );

        const searchTerm = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const selectedCategory = categoryFilter
            ? categoryFilter.value.trim()
            : "";

        return state.jobs.filter(function (job) {
            if (!isPublished(job)) {
                return false;
            }

            const searchableText = [
                getJobTitle(job),
                getJobDescription(job),
                getJobLocation(job),
                getJobType(job),
                getJobSalary(job),
                getJobDepartment(job),
                getJobCategory(job)
            ]
                .join(" ")
                .toLowerCase();

            if (
                searchTerm &&
                !searchableText.includes(searchTerm)
            ) {
                return false;
            }

            if (
                selectedCategory &&
                !categoriesMatch(
                    getJobCategory(job),
                    selectedCategory
                )
            ) {
                return false;
            }

            return true;
        });
    }

    function renderJobs() {
        const containers = queryAllUnique(
            SELECTORS.jobsContainers
        );

        if (containers.length === 0) {
            return;
        }

        const filteredJobs = getFilteredJobs();

        containers.forEach(function (container) {
            container.replaceChildren();
            container.setAttribute("aria-busy", "false");

            if (filteredJobs.length === 0) {
                const hasPublishedJobs =
                    state.jobs.some(isPublished);

                const message = hasPublishedJobs
                    ? "No vacancies match your search. Try another keyword or category."
                    : "There are currently no vacancies available. Please check again soon.";

                container.appendChild(
                    createElement(
                        "p",
                        "jobs-empty",
                        message
                    )
                );

                return;
            }

            const fragment =
                document.createDocumentFragment();

            filteredJobs.forEach(function (job) {
                fragment.appendChild(
                    createJobCard(job)
                );
            });

            container.appendChild(fragment);
        });

        updateJobCount(filteredJobs.length);

        if (filteredJobs.length === 0) {
            setStatus(
                "No matching vacancies found.",
                "info"
            );
        } else {
            setStatus(
                "Showing " + filteredJobs.length +
                (filteredJobs.length === 1
                    ? " vacancy."
                    : " vacancies."),
                "success"
            );
        }
    }

    /* --------------------------------------------------------
       APPLICATION FORM INTEGRATION
       -------------------------------------------------------- */

    function getApplicationForm() {
        return queryFirst(
            SELECTORS.applicationForms
        );
    }

    function selectJobForApplication(job) {
        const form = getApplicationForm();

        const jobId = getJobId(job);
        const jobTitle = getJobTitle(job);

        if (!form) {
            setStatus(
                "To apply, email " +
                CONFIG.contactEmail +
                " and include the job title: " +
                jobTitle + ".",
                "info"
            );

            return;
        }

        const selects = queryAllUnique(
            SELECTORS.jobSelects
        );

        let selectionMade = false;

        selects.forEach(function (select) {
            if (select.tagName !== "SELECT") {
                return;
            }

            const matchingOption = Array.from(
                select.options
            ).find(function (option) {
                return option.value === jobId;
            });

            if (matchingOption) {
                select.value = matchingOption.value;

                select.dispatchEvent(
                    new window.Event("change", {
                        bubbles: true
                    })
                );

                selectionMade = true;
            }
        });

        const hiddenJobId = form.querySelector(
            'input[name="job_id"]'
        );

        if (hiddenJobId && hiddenJobId.type !== "file") {
            hiddenJobId.value = jobId;

            hiddenJobId.dispatchEvent(
                new window.Event("change", {
                    bubbles: true
                })
            );

            selectionMade = true;
        }

        const hiddenJobTitle = form.querySelector(
            'input[name="job_title"]'
        );

        if (hiddenJobTitle && hiddenJobTitle.type !== "file") {
            hiddenJobTitle.value = jobTitle;

            hiddenJobTitle.dispatchEvent(
                new window.Event("change", {
                    bubbles: true
                })
            );

            selectionMade = true;
        }

        const applicationSection = document.getElementById(
            "submit-cv"
        );

        (applicationSection || form).scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        if (selectionMade) {
            setStatus(
                "Selected vacancy: " +
                jobTitle +
                ". Complete the application form below.",
                "success"
            );
        } else {
            setStatus(
                "You selected " +
                jobTitle +
                ". Please select the vacancy in the application form.",
                "info"
            );
        }

        const firstField = form.querySelector(
            'input:not([type="hidden"]):not([type="file"]):not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled])'
        );

        if (firstField) {
            window.setTimeout(function () {
                firstField.focus({
                    preventScroll: true
                });
            }, 350);
        }
    }

    /* --------------------------------------------------------
       RESET FILTERS
       -------------------------------------------------------- */

    function resetFilters() {
        queryAllUnique(
            SELECTORS.searchInputs
        ).forEach(function (input) {
            input.value = "";
        });

        queryAllUnique(
            SELECTORS.categoryFilters
        ).forEach(function (select) {
            select.value = "";
        });

        if (state.loaded) {
            renderJobs();
        }
    }

    function setupResetButtons() {
        queryAllUnique(
            SELECTORS.resetButtons
        ).forEach(function (button) {
            if (button.dataset.averraJobsResetReady === "true") {
                return;
            }

            button.dataset.averraJobsResetReady = "true";

            button.addEventListener("click", function (event) {
                event.preventDefault();
                resetFilters();
            });
        });
    }

    /* --------------------------------------------------------
       LOAD VACANCIES
       -------------------------------------------------------- */

    async function loadJobs() {
        if (state.loading) {
            return;
        }

        state.loading = true;
        state.error = null;

        const requestNumber = ++state.requestNumber;

        setStatus("Loading current vacancies…", "info");

        queryAllUnique(
            SELECTORS.jobsContainers
        ).forEach(function (container) {
            container.setAttribute("aria-busy", "true");
        });

        queryAllUnique(
            SELECTORS.retryButtons
        ).forEach(function (button) {
            button.disabled = true;
        });

        try {
            const payload = await apiRequest(
                CONFIG.jobsEndpoint +
                "?limit=" + CONFIG.jobsLimit +
                "&offset=0"
            );

            if (requestNumber !== state.requestNumber) {
                return;
            }

            const jobs = extractJobs(payload);

            if (jobs === null) {
                throw new Error(
                    "The jobs service returned an unexpected response."
                );
            }

            state.jobs = jobs;
            state.loaded = true;
            state.error = null;

            populateJobSelects();
            renderJobs();

        } catch (error) {
            if (requestNumber !== state.requestNumber) {
                return;
            }

            state.error = getErrorMessage(
                error,
                "Unable to load vacancies."
            );

            console.error(
                "AVERRA Jobs: failed to load vacancies.",
                error
            );

            showError(
                "We couldn't load the vacancies right now. Please try again shortly."
            );

        } finally {
            if (requestNumber === state.requestNumber) {
                state.loading = false;

                queryAllUnique(
                    SELECTORS.retryButtons
                ).forEach(function (button) {
                    button.disabled = false;
                });
            }
        }
    }

    /* --------------------------------------------------------
       EVENT HANDLERS
       -------------------------------------------------------- */

    function setupRetryButtons() {
        queryAllUnique(
            SELECTORS.retryButtons
        ).forEach(function (button) {
            if (button.dataset.averraJobsRetryReady === "true") {
                return;
            }

            button.dataset.averraJobsRetryReady = "true";

            button.addEventListener("click", function (event) {
                event.preventDefault();
                loadJobs();
            });
        });
    }

    function setupFilters() {
        queryAllUnique(
            SELECTORS.searchInputs
        ).forEach(function (input) {
            if (input.dataset.averraJobsFilterReady === "true") {
                return;
            }

            input.dataset.averraJobsFilterReady = "true";

            input.addEventListener("input", function () {
                if (state.loaded) {
                    renderJobs();
                }
            });
        });

        queryAllUnique(
            SELECTORS.categoryFilters
        ).forEach(function (select) {
            if (select.dataset.averraJobsFilterReady === "true") {
                return;
            }

            select.dataset.averraJobsFilterReady = "true";

            select.addEventListener("change", function () {
                if (state.loaded) {
                    renderJobs();
                }
            });
        });
    }

    function setupApplicationForms() {
        queryAllUnique(
            SELECTORS.applicationForms
        ).forEach(function (form) {
            form.dataset.averraApplicationFormDetected = "true";
        });
    }

    /* --------------------------------------------------------
       INITIALISATION
       -------------------------------------------------------- */

    function initialise() {
        const jobsContainer = queryFirst(
            SELECTORS.jobsContainers
        );

        if (!jobsContainer) {
            return;
        }

        if (state.initialised) {
            return;
        }

        state.initialised = true;

        setupRetryButtons();
        setupResetButtons();
        setupFilters();
        setupApplicationForms();

        loadJobs();
    }

    /* --------------------------------------------------------
       PUBLIC API
       -------------------------------------------------------- */

    window.AVERRAJobs = {
        version: VERSION,

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

        selectJobForApplication: selectJobForApplication,

        resetFilters: resetFilters
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            { once: true }
        );
    } else {
        initialise();
    }

})(window, document);
