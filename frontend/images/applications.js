
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: frontend/images/applications.js
   Version: 12.0.0

   FEATURES
   - Loads published vacancies from the AVERRA API
   - Supports numeric/string job IDs and general applications
   - Supports multiple application forms
   - Filters vacancy cards by category and search term
   - Validates applicant details and CV files
   - Accepts PDF, DOC and DOCX files up to 5 MB
   - Requires privacy consent
   - Sends applications using multipart/form-data
   - Prevents duplicate submissions
   - Handles JSON and non-JSON server errors
   - Supports a separately hosted frontend and backend
   - Preserves the existing AVERRA HTML selectors

   REQUIRED BACKEND ENDPOINTS
   GET  /api/jobs?limit=100
   POST /api/applications

   EXPECTED APPLICATION FORM FIELDS
   full_name, email, phone, job_id, job_title,
   cover_letter, privacy_consent, cv

   IMPORTANT
   Backend validation and secure CV storage are essential.
   ============================================================ */

(function () {
    "use strict";

    const CONFIG = Object.freeze({
        version: "12.0.0",

        apiBaseUrl: String(
            window.AVERRA_API_BASE_URL ||
            window.location.origin
        ).replace(/\/+$/, ""),

        jobsEndpoint: "/api/jobs?limit=100",
        applicationsEndpoint: "/api/applications",

        maxCvBytes: 5 * 1024 * 1024,
        requestTimeoutMs: 20000,

        allowedExtensions: ["pdf", "doc", "docx"],

        allowedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream"
        ]
    });

    const state = {
        jobs: [],
        isLoadingJobs: false,
        isSubmitting: false,
        jobsLoaded: false
    };

    const SELECTORS = Object.freeze({
        form: [
            "#cv-application-form",
            "#application-form",
            "form[data-application-form]"
        ],

        jobSelect: [
            "#applicant-role",
            "#application-job",
            '[name="job_id"]',
            '[name="job_title"]'
        ],

        cvInput: [
            "#applicant-cv",
            "#application-cv",
            'input[type="file"][name="cv"]',
            'input[type="file"][name="resume"]'
        ],

        status: [
            "#cv-application-status",
            "#application-status"
        ],

        submitButton: [
            "#cv-submit-button",
            "#application-submit-button",
            'button[type="submit"]',
            'input[type="submit"]'
        ],

        jobsGrid: [
            "#jobs-grid",
            "#vacancies-grid",
            ".jobs-grid"
        ],

        categoryFilter: [
            "#job-category-filter",
            "#jobs-category-filter",
            "#department-filter"
        ],

        searchInput: [
            "#job-search",
            "#jobs-search",
            "#vacancy-search"
        ],

        privacyCheckbox: [
            "#applicant-privacy",
            "#privacy-consent",
            "#application-privacy",
            '[name="privacy_consent"]',
            '[name="privacy-consent"]'
        ],

        fullName: [
            "#applicant-name",
            "#applicant-full-name",
            "#full-name",
            '[name="full_name"]',
            '[name="full-name"]',
            '[name="name"]'
        ],

        email: [
            "#applicant-email",
            "#application-email",
            '[name="email"]'
        ],

        phone: [
            "#applicant-phone",
            "#application-phone",
            '[name="phone"]'
        ],

        coverLetter: [
            "#applicant-cover-letter",
            "#cover-letter",
            '[name="cover_letter"]',
            '[name="cover-letter"]'
        ]
    });

    /* --------------------------------------------------------
       DOM HELPERS
       -------------------------------------------------------- */

    function findElement(selectors, root) {
        const scope = root || document;

        for (const selector of selectors) {
            const element = scope.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function findAllElements(selectors, root) {
        const scope = root || document;
        const results = [];

        for (const selector of selectors) {
            scope.querySelectorAll(selector).forEach(function (element) {
                if (!results.includes(element)) {
                    results.push(element);
                }
            });
        }

        return results;
    }

    function getApplicationForms() {
        return findAllElements(SELECTORS.form);
    }

    function getFieldValue(form, selectors) {
        const field = findElement(selectors, form);

        return field && typeof field.value === "string"
            ? field.value.trim()
            : "";
    }

    function getStatusElement(form) {
        return findElement(SELECTORS.status, form) ||
            findElement(SELECTORS.status);
    }

    function setStatus(message, type, form) {
        const statusElement = getStatusElement(form);

        if (!statusElement) {
            if (message) {
                console.log("[AVERRA Applications]", message);
            }

            return;
        }

        statusElement.textContent = message || "";
        statusElement.dataset.state = type || "idle";
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
    }

    function setSubmitting(isSubmitting, form) {
        state.isSubmitting = isSubmitting;

        const button = findElement(
            SELECTORS.submitButton,
            form
        );

        if (!button) {
            return;
        }

        if (!button.dataset.originalText) {
            button.dataset.originalText =
                button.tagName === "INPUT"
                    ? button.value || "Submit Application"
                    : button.textContent.trim() || "Submit Application";
        }

        button.disabled = isSubmitting;
        button.setAttribute(
            "aria-busy",
            isSubmitting ? "true" : "false"
        );

        const text = isSubmitting
            ? "Submitting..."
            : button.dataset.originalText;

        if (button.tagName === "INPUT") {
            button.value = text;
        } else {
            button.textContent = text;
        }
    }

    /* --------------------------------------------------------
       HTTP HELPERS
       -------------------------------------------------------- */

    async function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();

        const timeout = window.setTimeout(function () {
            controller.abort();
        }, timeoutMs || CONFIG.requestTimeoutMs);

        try {
            return await fetch(
                url,
                Object.assign({}, options, {
                    signal: controller.signal
                })
            );
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function readResponse(response) {
        const contentType = (
            response.headers.get("content-type") || ""
        ).toLowerCase();

        if (contentType.includes("application/json")) {
            try {
                return await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }
        }

        const text = await response.text();

        if (!text.trim()) {
            return {};
        }

        if (!response.ok) {
            throw new Error(
                "The server could not complete your request. " +
                "Please try again later."
            );
        }

        return {};
    }

    function getErrorMessage(data, fallback) {
        if (data && typeof data.detail === "string") {
            return data.detail;
        }

        if (data && typeof data.message === "string") {
            return data.message;
        }

        if (data && Array.isArray(data.detail)) {
            return data.detail.map(function (item) {
                if (item && typeof item.msg === "string") {
                    return item.msg;
                }

                return "Please check the information you entered.";
            }).join(" ");
        }

        if (data && typeof data.error === "string") {
            return data.error;
        }

        return fallback || "Something went wrong. Please try again.";
    }

    function getRequestErrorMessage(error, action) {
        if (error && error.name === "AbortError") {
            return (
                "The request took too long. Please check your connection " +
                "and try again. If you are unsure whether your application " +
                "was received, contact info@averrastaffing.co.uk."
            );
        }

        if (error instanceof TypeError) {
            return (
                "We could not connect to the server. Please try again later."
            );
        }

        return error && error.message
            ? error.message
            : action || "The request could not be completed.";
    }

    /* --------------------------------------------------------
       VACANCY DATA
       -------------------------------------------------------- */

    function normaliseJobs(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (payload && Array.isArray(payload.jobs)) {
            return payload.jobs;
        }

        if (payload && Array.isArray(payload.items)) {
            return payload.items;
        }

        if (payload && Array.isArray(payload.results)) {
            return payload.results;
        }

        return [];
    }

    function isPublishedJob(job) {
        if (!job || job.id == null || !job.title) {
            return false;
        }

        const status = String(job.status || "")
            .trim()
            .toLowerCase();

        /*
         * Accept common published-status formats.
         * If a status is supplied, it must identify a published job.
         * If no status is supplied, accept the record only when the API
         * explicitly marks it as published.
         */
        if (status) {
            if (
                status !== "published" &&
                status !== "active" &&
                status !== "open"
            ) {
                return false;
            }
        } else if (
            job.is_published !== true &&
            job.published !== true
        ) {
            return false;
        }

        if (job.is_published === false || job.published === false) {
            return false;
        }

        if (job.closing_date) {
            const closingDate = new Date(job.closing_date);

            if (!Number.isNaN(closingDate.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                closingDate.setHours(0, 0, 0, 0);

                if (closingDate < today) {
                    return false;
                }
            }
        }

        return true;
    }

    function getJobId(job) {
        return String(job.id);
    }

    function getJobById(id) {
        if (id === null || id === undefined || id === "") {
            return null;
        }

        return state.jobs.find(function (job) {
            return getJobId(job) === String(id);
        }) || null;
    }

    function getJobTitleForSelection(selectedValue) {
        if (!selectedValue || selectedValue === "general") {
            return "General Application";
        }

        const job = getJobById(selectedValue);

        return job ? job.title : "";
    }

    function populateJobSelect(form) {
        const select = findElement(SELECTORS.jobSelect, form);

        if (!select || select.tagName !== "SELECT") {
            return;
        }

        const previousValue = select.value;

        select.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a vacancy (optional)";
        select.appendChild(placeholder);

        const generalOption = document.createElement("option");
        generalOption.value = "general";
        generalOption.textContent = "General Application";
        select.appendChild(generalOption);

        state.jobs.forEach(function (job) {
            const option = document.createElement("option");

            option.value = getJobId(job);
            option.textContent = String(job.title);

            select.appendChild(option);
        });

        const previousValueExists = Array.from(select.options).some(
            function (option) {
                return option.value === previousValue;
            }
        );

        select.value = previousValueExists ? previousValue : "";
    }

    function getCategories() {
        const categories = new Set();

        state.jobs.forEach(function (job) {
            const category = String(
                job.department || job.category || ""
            ).trim();

            if (category) {
                categories.add(category);
            }
        });

        return Array.from(categories).sort(function (a, b) {
            return a.localeCompare(b);
        });
    }

    function populateCategoryFilter() {
        const filter = findElement(SELECTORS.categoryFilter);

        if (!filter || filter.tagName !== "SELECT") {
            return;
        }

        const previousValue = filter.value;

        filter.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All departments";
        filter.appendChild(allOption);

        getCategories().forEach(function (category) {
            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            filter.appendChild(option);
        });

        const valueExists = Array.from(filter.options).some(
            function (option) {
                return option.value === previousValue;
            }
        );

        filter.value = valueExists ? previousValue : "";
    }

    async function loadVacancies() {
        if (state.isLoadingJobs) {
            return;
        }

        state.isLoadingJobs = true;

        try {
            const response = await fetchWithTimeout(
                CONFIG.apiBaseUrl + CONFIG.jobsEndpoint,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const payload = await readResponse(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        payload,
                        "Unable to load vacancies."
                    )
                );
            }

            state.jobs = normaliseJobs(payload).filter(isPublishedJob);
            state.jobsLoaded = true;

            getApplicationForms().forEach(function (form) {
                populateJobSelect(form);
            });

            populateCategoryFilter();
            applyJobFilters();

            document.dispatchEvent(
                new CustomEvent("averra:jobs-loaded", {
                    detail: {
                        count: state.jobs.length,
                        version: CONFIG.version
                    }
                })
            );

            console.info(
                "[AVERRA Applications] Loaded " +
                state.jobs.length +
                " published vacancies."
            );

        } catch (error) {
            console.error(
                "[AVERRA Applications] Vacancy loading failed:",
                error
            );

            getApplicationForms().forEach(function (form) {
                setStatus(
                    "We could not load vacancies right now. " +
                    "You can still try submitting a general application.",
                    "warning",
                    form
                );
            });
        } finally {
            state.isLoadingJobs = false;
        }
    }

    /* --------------------------------------------------------
       JOB CARD FILTERING
       -------------------------------------------------------- */

    function getCardText(card) {
        return (card.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function getCardJob(card) {
        const explicitId =
            card.dataset.jobId ||
            card.getAttribute("data-job-id");

        if (explicitId) {
            return getJobById(explicitId);
        }

        const titleElement = card.querySelector(
            ".job-title, .job-card-title, h2, h3, h4"
        );

        const title = titleElement
            ? titleElement.textContent.trim().toLowerCase()
            : "";

        if (!title) {
            return null;
        }

        return state.jobs.find(function (job) {
            return String(job.title).trim().toLowerCase() === title;
        }) || null;
    }

    function applyJobFilters() {
        const grid = findElement(SELECTORS.jobsGrid);

        if (!grid) {
            return;
        }

        const searchInput = findElement(SELECTORS.searchInput);
        const categoryFilter = findElement(SELECTORS.categoryFilter);

        const searchTerm = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const selectedCategory = categoryFilter
            ? categoryFilter.value.trim().toLowerCase()
            : "";

        const cards = grid.querySelectorAll(
            ".job-card, [data-job-card], article"
        );

        cards.forEach(function (card) {
            const cardText = getCardText(card);
            const job = getCardJob(card);

            const category = job
                ? String(job.department || job.category || "")
                    .trim()
                    .toLowerCase()
                : "";

            const matchesSearch =
                !searchTerm || cardText.includes(searchTerm);

            const matchesCategory =
                !selectedCategory ||
                category === selectedCategory;

            card.hidden = !(matchesSearch && matchesCategory);
        });
    }

    /* --------------------------------------------------------
       APPLICATION FORM VALIDATION
       -------------------------------------------------------- */

    function getApplicantFields(form) {
        return {
            fullName: getFieldValue(form, SELECTORS.fullName),
            email: getFieldValue(form, SELECTORS.email),
            phone: getFieldValue(form, SELECTORS.phone),
            coverLetter: getFieldValue(form, SELECTORS.coverLetter)
        };
    }

    function getPrivacyCheckbox(form) {
        return findElement(SELECTORS.privacyCheckbox, form);
    }

    function validateApplicantFields(fields) {
        if (!fields.fullName) {
            return "Please enter your full name.";
        }

        if (fields.fullName.length > 150) {
            return "Your name must be 150 characters or fewer.";
        }

        if (!fields.email) {
            return "Please enter your email address.";
        }

        if (fields.email.length > 254) {
            return "Your email address is too long.";
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(fields.email)) {
            return "Please enter a valid email address.";
        }

        if (fields.phone.length > 50) {
            return "Your phone number must be 50 characters or fewer.";
        }

        if (fields.coverLetter.length > 10000) {
            return "Your cover letter is too long.";
        }

        return "";
    }

    function validateCv(file) {
        if (!file) {
            return "Please attach your CV.";
        }

        if (file.size <= 0) {
            return "The selected CV file is empty.";
        }

        if (file.size > CONFIG.maxCvBytes) {
            return "Your CV must be no larger than 5 MB.";
        }

        const filename = String(file.name || "");
        const lastDot = filename.lastIndexOf(".");

        const extension = lastDot >= 0
            ? filename.slice(lastDot + 1).toLowerCase()
            : "";

        if (!CONFIG.allowedExtensions.includes(extension)) {
            return "Please upload your CV as a PDF, DOC or DOCX file.";
        }

        /*
         * The browser MIME type is not authoritative.
         * An empty or generic MIME type is allowed here, but the backend
         * must inspect the file contents and enforce its own allowlist.
         */
        const mimeType = String(file.type || "").toLowerCase();

        if (
            mimeType &&
            mimeType !== "application/octet-stream" &&
            !CONFIG.allowedMimeTypes.includes(mimeType)
        ) {
            return "The selected file type is not supported.";
        }

        return "";
    }

    function validateForm(form, fields, file, privacyCheckbox) {
        const fieldError = validateApplicantFields(fields);

        if (fieldError) {
            return fieldError;
        }

        const cvError = validateCv(file);

        if (cvError) {
            return cvError;
        }

        if (!privacyCheckbox || !privacyCheckbox.checked) {
            return "Please confirm the privacy consent before submitting.";
        }

        const select = findElement(SELECTORS.jobSelect, form);

        if (
            select &&
            select.value &&
            select.value !== "general" &&
            !getJobById(select.value)
        ) {
            return (
                "The selected vacancy is no longer available. " +
                "Please choose another vacancy."
            );
        }

        return "";
    }

    function getInvalidField(form, fields, file, privacyCheckbox) {
        if (!fields.fullName) {
            return findElement(SELECTORS.fullName, form);
        }

        if (!fields.email) {
            return findElement(SELECTORS.email, form);
        }

        if (!file) {
            return findElement(SELECTORS.cvInput, form);
        }

        if (!privacyCheckbox || !privacyCheckbox.checked) {
            return privacyCheckbox;
        }

        return null;
    }

    /* --------------------------------------------------------
       APPLICATION REQUEST
       -------------------------------------------------------- */

    function buildApplicationFormData(form, fields, file) {
        const data = new FormData();

        const select = findElement(SELECTORS.jobSelect, form);
        const selectedValue = select ? select.value.trim() : "";

        const selectedJob =
            selectedValue && selectedValue !== "general"
                ? getJobById(selectedValue)
                : null;

        const jobTitle = selectedJob
            ? selectedJob.title
            : "General Application";

        data.append("full_name", fields.fullName);
        data.append("email", fields.email.toLowerCase());
        data.append("phone", fields.phone);
        data.append(
            "job_id",
            selectedJob ? String(selectedJob.id) : ""
        );
        data.append("job_title", jobTitle);
        data.append("cover_letter", fields.coverLetter);
        data.append("privacy_consent", "true");
        data.append("cv", file, file.name);

        return data;
    }

    async function submitApplication(event) {
        const form = event.currentTarget;

        if (!form || !form.matches("form")) {
            return;
        }

        event.preventDefault();

        if (state.isSubmitting || form.dataset.submitting === "true") {
            return;
        }

        const fields = getApplicantFields(form);
        const cvInput = findElement(SELECTORS.cvInput, form);

        const file = cvInput && cvInput.files
            ? cvInput.files[0]
            : null;

        const privacyCheckbox = getPrivacyCheckbox(form);

        const validationError = validateForm(
            form,
            fields,
            file,
            privacyCheckbox
        );

        if (validationError) {
            setStatus(validationError, "error", form);

            const invalidField = getInvalidField(
                form,
                fields,
                file,
                privacyCheckbox
            );

            if (invalidField && typeof invalidField.focus === "function") {
                invalidField.focus();
            }

            return;
        }

        const formData = buildApplicationFormData(
            form,
            fields,
            file
        );

        form.dataset.submitting = "true";
        setSubmitting(true, form);

        setStatus(
            "Submitting your application. Please wait...",
            "loading",
            form
        );

        try {
            const response = await fetchWithTimeout(
                CONFIG.apiBaseUrl + CONFIG.applicationsEndpoint,
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json"
                    },
                    body: formData
                }
            );

            const payload = await readResponse(response);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        payload,
                        "Your application could not be submitted."
                    )
                );
            }

            if (payload && payload.success === false) {
                throw new Error(
                    getErrorMessage(
                        payload,
                        "Your application could not be submitted."
                    )
                );
            }

            const applicationId =
                payload && (
                    payload.application_id ??
                    payload.id ??
                    null
                );

            const emailSent =
                payload && (
                    payload.notification_sent ??
                    payload.email_sent ??
                    null
                );

            form.reset();

            /*
             * Reset the job selection to the placeholder and retain
             * the current list of available vacancies.
             */
            const jobSelect = findElement(
                SELECTORS.jobSelect,
                form
            );

            if (jobSelect) {
                jobSelect.value = "";
            }

            const referenceMessage = applicationId !== null
                ? " Reference: " + String(applicationId) + "."
                : "";

            if (emailSent === false) {
                setStatus(
                    "Your application has been received, but the email " +
                    "notification could not be sent. Please contact " +
                    "info@averrastaffing.co.uk if you need confirmation." +
                    referenceMessage,
                    "warning",
                    form
                );
            } else {
                setStatus(
                    "Thank you. Your application has been submitted " +
                    "successfully." + referenceMessage,
                    "success",
                    form
                );
            }

            document.dispatchEvent(
                new CustomEvent("averra:application-submitted", {
                    detail: {
                        applicationId: applicationId
                    }
                })
            );

        } catch (error) {
            console.error(
                "[AVERRA Applications] Submission failed:",
                error
            );

            setStatus(
                getRequestErrorMessage(
                    error,
                    "Your application could not be submitted."
                ),
                "error",
                form
            );

        } finally {
            form.dataset.submitting = "false";
            setSubmitting(false, form);
        }
    }

    /* --------------------------------------------------------
       APPLY BUTTONS
       -------------------------------------------------------- */

    function handleHowToApply(event) {
        const target = event.target;

        if (!target || typeof target.closest !== "function") {
            return;
        }

        const trigger = target.closest(
            'a, button, [role="button"]'
        );

        if (!trigger) {
            return;
        }

        const label = (trigger.textContent || "")
            .trim()
            .toLowerCase();

        const acceptedLabels = [
            "how to apply",
            "apply now",
            "apply for this job"
        ];

        if (!acceptedLabels.includes(label)) {
            return;
        }

        const card = trigger.closest(
            ".job-card, [data-job-card], article"
        );

        if (!card) {
            return;
        }

        const job = getCardJob(card);

        if (!job) {
            return;
        }

        const forms = getApplicationForms();

        const form = forms.find(function (candidate) {
            return candidate.querySelector(
                SELECTORS.jobSelect.join(",")
            );
        }) || forms[0];

        if (!form) {
            return;
        }

        const select = findElement(SELECTORS.jobSelect, form);

        if (select) {
            select.value = getJobId(job);

            select.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }

        const applicationTarget =
            document.querySelector("#submit-cv") ||
            document.querySelector("#cv-application-form") ||
            document.querySelector("#application-form") ||
            form;

        event.preventDefault();

        applicationTarget.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        if (applicationTarget.matches(
            "input, select, textarea, button"
        )) {
            applicationTarget.focus({ preventScroll: true });
        }
    }

    /* --------------------------------------------------------
       INITIALISATION
       -------------------------------------------------------- */

    function initialise() {
        const forms = getApplicationForms();

        if (forms.length) {
            forms.forEach(function (form) {
                /*
                 * The form's own listener ensures the submitted form
                 * is used rather than always selecting the first form.
                 */
                form.addEventListener(
                    "submit",
                    submitApplication
                );

                if (state.jobsLoaded) {
                    populateJobSelect(form);
                }
            });
        } else {
            console.warn(
                "[AVERRA Applications] Application form not found. " +
                "Vacancy loading and filtering will still be initialised."
            );
        }

        const searchInput = findElement(SELECTORS.searchInput);
        const categoryFilter = findElement(SELECTORS.categoryFilter);

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                applyJobFilters
            );
        }

        if (categoryFilter) {
            categoryFilter.addEventListener(
                "change",
                applyJobFilters
            );
        }

        document.addEventListener(
            "click",
            handleHowToApply
        );

        const jobsGrid = findElement(SELECTORS.jobsGrid);

        if (
            jobsGrid &&
            typeof MutationObserver !== "undefined"
        ) {
            const observer = new MutationObserver(function () {
                applyJobFilters();
            });

            observer.observe(jobsGrid, {
                childList: true,
                subtree: true
            });
        }

        loadVacancies();

        console.info(
            "[AVERRA Applications] Version " +
            CONFIG.version +
            " initialised."
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            { once: true }
        );
    } else {
        initialise();
    }
})();
