
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: frontend/images/applications.js
   Version: 6.0.0

   Responsibilities:
   - Load published vacancies from the AVERRA FastAPI backend
   - Display vacancy cards
   - Search and filter vacancies
   - Populate the application form's vacancy selector
   - Validate candidate details and CV files
   - Submit applications to POST /api/applications
   - Display success and error messages

   Backend:
   https://averra-backend-dn23.onrender.com
   ============================================================ */

(() => {
    const CONFIG = Object.freeze({
        apiBaseUrl:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        jobsEndpoint: "/api/jobs",
        applicationsEndpoint: "/api/applications",

        requestTimeout: 20000,
        jobsLimit: 100,

        maxCvSize: 5 * 1024 * 1024,

        acceptedExtensions: [".pdf", ".doc", ".docx"],

        acceptedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",
            "binary/octet-stream"
        ],

        contactEmail: "info@averrastaffing.co.uk"
    });

    window.AVERRA_API_BASE_URL = CONFIG.apiBaseUrl;

    const state = {
        jobs: [],
        jobsLoaded: false,
        jobsLoading: false,
        submitting: false
    };

    const SELECTORS = {
        jobsGrid: "#jobs-grid",
        jobsStatus: "#jobs-status",
        jobsCount: "#jobs-results-count",
        search: "#job-search",
        category: "#job-category-filter",

        form: "#cv-application-form",
        applicationStatus: "#cv-application-status",
        submit: "#cv-submit-button",

        name: "#applicant-name",
        email: "#applicant-email",
        phone: "#applicant-phone",
        job: "#applicant-role",
        coverLetter: "#applicant-cover-letter",
        cv: "#applicant-cv",
        privacy: "#applicant-privacy"
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    function apiUrl(endpoint) {
        return (
            String(CONFIG.apiBaseUrl).replace(/\/+$/, "") +
            endpoint
        );
    }

    function makeElement(tag, className = "", text = "") {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function showMessage(element, message, type = "info") {
        if (!element) {
            if (message) {
                console.info("[AVERRA]", message);
            }
            return;
        }

        element.textContent = message;
        element.className = "jobs-message " + type;
        element.hidden = !message;
        element.setAttribute(
            "role",
            type === "error" ? "alert" : "status"
        );
        element.setAttribute(
            "aria-live",
            type === "error" ? "assertive" : "polite"
        );
    }

    function hideMessage(element) {
        if (!element) return;

        element.textContent = "";
        element.hidden = true;
    }

    async function apiRequest(endpoint, options = {}) {
        const controller = new AbortController();

        const timeoutId = window.setTimeout(
            () => controller.abort(),
            CONFIG.requestTimeout
        );

        try {
            const response = await fetch(apiUrl(endpoint), {
                ...options,
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    ...(options.headers || {})
                }
            });

            const responseText = await response.text();

            let data = null;

            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    throw new Error(
                        "The server returned an unexpected response. Please try again later."
                    );
                }
            }

            if (!response.ok) {
                const detail =
                    data?.detail ||
                    data?.message ||
                    data?.error ||
                    `The server returned HTTP ${response.status}.`;

                if (Array.isArray(detail)) {
                    throw new Error(
                        detail
                            .map(item => item.msg || "Invalid information")
                            .join(" ")
                    );
                }

                throw new Error(String(detail));
            }

            return data;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "The request timed out. Please try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the AVERRA server. Please try again later."
                );
            }

            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    /* ========================================================
       JOB DATA
       The backend GET /api/jobs already returns published jobs.
       ======================================================== */

    function normalizeJobsResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.jobs)) return data.jobs;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.results)) return data.results;

        return [];
    }

    function jobId(job) {
        return job?.id ?? job?.job_id ?? null;
    }

    function jobTitle(job) {
        return String(
            job?.title ||
            job?.job_title ||
            job?.name ||
            "Untitled vacancy"
        ).trim();
    }

    function jobCategory(job) {
        return String(
            job?.category ||
            job?.department ||
            job?.industry ||
            "Other"
        ).trim() || "Other";
    }

    function jobDescription(job) {
        return String(
            job?.description ||
            job?.summary ||
            job?.job_description ||
            ""
        ).trim();
    }

    function jobIsPublished(job) {
        if (!job || typeof job !== "object") {
            return false;
        }

        if (job.status !== undefined && job.status !== null) {
            return String(job.status).toLowerCase() === "published";
        }

        if (job.published !== undefined) {
            return job.published === true;
        }

        // The public backend endpoint only returns published jobs.
        return true;
    }

    function populateCategories(jobs) {
        const select = $(SELECTORS.category);

        if (!select) return;

        const previousValue = select.value;

        const categories = [
            ...new Set(
                jobs
                    .map(jobCategory)
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

        select.replaceChildren();

        const allOption = makeElement(
            "option",
            "",
            "All categories"
        );

        allOption.value = "";
        select.appendChild(allOption);

        categories.forEach(category => {
            const option = makeElement(
                "option",
                "",
                category
            );

            option.value = category;
            select.appendChild(option);
        });

        if (categories.includes(previousValue)) {
            select.value = previousValue;
        }
    }

    function populateJobSelect(jobs) {
        const select = $(SELECTORS.job);

        if (!select) return;

        const previousValue = select.value;

        select.replaceChildren();

        const placeholder = makeElement(
            "option",
            "",
            "Select a vacancy"
        );

        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        const generalOption = makeElement(
            "option",
            "",
            "General Application"
        );

        generalOption.value = "general";
        select.appendChild(generalOption);

        jobs.forEach(job => {
            const id = jobId(job);

            if (id === null || id === undefined || !jobTitle(job)) {
                return;
            }

            const option = makeElement(
                "option",
                "",
                jobTitle(job)
            );

            option.value = String(id);
            option.dataset.jobTitle = jobTitle(job);
            option.dataset.jobId = String(id);

            select.appendChild(option);
        });

        const optionExists = Array.from(select.options).some(
            option => option.value === previousValue
        );

        if (optionExists && previousValue) {
            select.value = previousValue;
        } else {
            select.value = "";
        }
    }

    /* ========================================================
       VACANCY CARDS
       ======================================================== */

    function renderJobCard(job) {
        const card = makeElement("article", "job-card");

        const top = makeElement("div", "job-card-top");

        top.appendChild(
            makeElement(
                "span",
                "job-category",
                jobCategory(job)
            )
        );

        card.appendChild(top);

        card.appendChild(
            makeElement("h3", "", jobTitle(job))
        );

        const meta = makeElement("div", "job-meta");

        if (job.location) {
            meta.appendChild(
                makeElement(
                    "span",
                    "",
                    "Location: " + job.location
                )
            );
        }

        if (job.work_arrangement) {
            meta.appendChild(
                makeElement(
                    "span",
                    "",
                    "Working arrangement: " + job.work_arrangement
                )
            );
        }

        if (job.employment_type) {
            meta.appendChild(
                makeElement(
                    "span",
                    "",
                    "Employment type: " + job.employment_type
                )
            );
        }

        if (job.salary) {
            meta.appendChild(
                makeElement(
                    "span",
                    "",
                    "Salary: " + job.salary
                )
            );
        }

        if (meta.childElementCount) {
            card.appendChild(meta);
        }

        const description = jobDescription(job);

        if (description) {
            card.appendChild(
                makeElement(
                    "p",
                    "job-description",
                    description
                )
            );
        }

        if (Array.isArray(job.responsibilities)) {
            const responsibilities = makeElement(
                "ul",
                "job-responsibilities"
            );

            job.responsibilities.forEach(item => {
                if (typeof item === "string" && item.trim()) {
                    responsibilities.appendChild(
                        makeElement("li", "", item.trim())
                    );
                }
            });

            if (responsibilities.childElementCount) {
                card.appendChild(responsibilities);
            }
        }

        const applyButton = makeElement(
            "a",
            "jobs-button",
            "Apply for this job"
        );

        applyButton.href = "#submit-cv";

        applyButton.addEventListener("click", () => {
            const select = $(SELECTORS.job);

            if (select) {
                select.value = String(jobId(job));

                if (select.value !== String(jobId(job))) {
                    showMessage(
                        $(SELECTORS.applicationStatus),
                        "Please select this vacancy from the application form.",
                        "error"
                    );
                }
            }

            const form = $(SELECTORS.form);

            if (form) {
                form.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

        card.appendChild(applyButton);

        return card;
    }

    function updateJobsCount(count, total = count) {
        const element = $(SELECTORS.jobsCount);

        if (!element) return;

        if (count === total) {
            element.textContent =
                `${count} ${count === 1 ? "vacancy" : "vacancies"}`;
        } else {
            element.textContent =
                `Showing ${count} of ${total} vacancies`;
        }
    }

    function filterJobs() {
        const grid = $(SELECTORS.jobsGrid);

        if (!grid) return;

        const search = (
            $(SELECTORS.search)?.value || ""
        ).trim().toLowerCase();

        const category = (
            $(SELECTORS.category)?.value || ""
        ).trim().toLowerCase();

        const filteredJobs = state.jobs.filter(job => {
            const categoryMatches =
                !category ||
                jobCategory(job).toLowerCase() === category;

            const searchableText = [
                jobTitle(job),
                jobDescription(job),
                jobCategory(job),
                job.location || "",
                job.work_arrangement || "",
                job.employment_type || "",
                job.salary || "",
                Array.isArray(job.responsibilities)
                    ? job.responsibilities.join(" ")
                    : ""
            ].join(" ").toLowerCase();

            return (
                categoryMatches &&
                (!search || searchableText.includes(search))
            );
        });

        grid.replaceChildren();

        if (!filteredJobs.length) {
            const message = state.jobs.length
                ? "No vacancies match your search. Try another search term or category."
                : "There are currently no published vacancies. Please check back later or contact AVERRA.";

            grid.appendChild(
                makeElement("div", "jobs-empty", message)
            );
        } else {
            filteredJobs.forEach(job => {
                grid.appendChild(renderJobCard(job));
            });
        }

        updateJobsCount(filteredJobs.length, state.jobs.length);
    }

    async function loadJobs(forceReload = false) {
        if (state.jobsLoading) return;

        if (state.jobsLoaded && !forceReload) {
            filterJobs();
            return;
        }

        const grid = $(SELECTORS.jobsGrid);
        const jobsStatus = $(SELECTORS.jobsStatus);

        state.jobsLoading = true;

        if (grid) {
            grid.replaceChildren();

            grid.appendChild(
                makeElement(
                    "div",
                    "jobs-empty",
                    "Loading current vacancies..."
                )
            );
        }

        if (jobsStatus) {
            hideMessage(jobsStatus);
        }

        try {
            const data = await apiRequest(
                `${CONFIG.jobsEndpoint}?limit=${CONFIG.jobsLimit}&offset=0`
            );

            state.jobs = normalizeJobsResponse(data)
                .filter(jobIsPublished);

            state.jobsLoaded = true;

            populateCategories(state.jobs);
            populateJobSelect(state.jobs);
            filterJobs();
        } catch (error) {
            console.error(
                "[AVERRA] Unable to load vacancies:",
                error
            );

            if (grid) {
                grid.replaceChildren();

                grid.appendChild(
                    makeElement(
                        "div",
                        "jobs-empty",
                        "Vacancies could not be loaded right now. Please try again later."
                    )
                );
            }

            updateJobsCount(0, 0);

            showMessage(
                jobsStatus,
                "We could not load vacancies from the server. Please refresh the page or contact " +
                    CONFIG.contactEmail + ".",
                "error"
            );
        } finally {
            state.jobsLoading = false;
        }
    }

    /* ========================================================
       APPLICATION FORM VALIDATION
       ======================================================== */

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateCv(file) {
        if (!file) {
            return "Please attach your CV or résumé.";
        }

        if (file.size <= 0) {
            return "The selected CV file is empty.";
        }

        if (file.size > CONFIG.maxCvSize) {
            return "Your CV must be no larger than 5 MB.";
        }

        const dot = file.name.lastIndexOf(".");
        const extension = dot >= 0
            ? file.name.slice(dot).toLowerCase()
            : "";

        if (!CONFIG.acceptedExtensions.includes(extension)) {
            return "Please upload your CV as a PDF, DOC or DOCX file.";
        }

        if (
            file.type &&
            !CONFIG.acceptedMimeTypes.includes(file.type)
        ) {
            return "The CV file type is not supported. Please use PDF, DOC or DOCX.";
        }

        return "";
    }

    function validateForm(form) {
        const nameInput = $(SELECTORS.name, form);
        const emailInput = $(SELECTORS.email, form);
        const phoneInput = $(SELECTORS.phone, form);
        const jobInput = $(SELECTORS.job, form);
        const coverLetterInput = $(SELECTORS.coverLetter, form);
        const cvInput = $(SELECTORS.cv, form);
        const privacyInput = $(SELECTORS.privacy, form);

        const name = (nameInput?.value || "").trim();
        const email = (emailInput?.value || "").trim();
        const phone = (phoneInput?.value || "").trim();
        const coverLetter = (coverLetterInput?.value || "").trim();

        if (!name) {
            return { error: "Please enter your full name." };
        }

        if (name.length > 150) {
            return {
                error: "Your name must be 150 characters or fewer."
            };
        }

        if (!email || email.length > 254 || !validateEmail(email)) {
            return { error: "Please enter a valid email address." };
        }

        if (phone.length > 50) {
            return {
                error: "Your phone number must be 50 characters or fewer."
            };
        }

        if (coverLetter.length > 10000) {
            return {
                error: "Your cover letter must be no longer than 10,000 characters."
            };
        }

        if (!jobInput || !jobInput.value) {
            return {
                error: "Please select a vacancy or General Application."
            };
        }

        if (!cvInput) {
            return {
                error: "The CV upload field could not be found. Please contact AVERRA."
            };
        }

        const file = cvInput.files?.[0];
        const cvError = validateCv(file);

        if (cvError) {
            return { error: cvError };
        }

        if (!privacyInput || !privacyInput.checked) {
            return {
                error: "Please confirm that you have read the Privacy Policy."
            };
        }

        const selectedOption =
            jobInput.options[jobInput.selectedIndex];

        return {
            name,
            email,
            phone,
            coverLetter,
            file,
            jobId: jobInput.value,
            jobTitle:
                selectedOption?.dataset.jobTitle ||
                selectedOption?.textContent.trim() ||
                "General Application"
        };
    }

    function setSubmitting(form, isSubmitting) {
        state.submitting = isSubmitting;

        const button = $(SELECTORS.submit, form);

        if (!button) return;

        if (isSubmitting) {
            if (button.dataset.originalText === undefined) {
                button.dataset.originalText = button.textContent;
            }

            button.disabled = true;
            button.textContent = "Submitting application...";
        } else {
            button.disabled = false;

            if (button.dataset.originalText !== undefined) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /* ========================================================
       SUBMIT APPLICATION
       Backend expects multipart/form-data:
       full_name, email, phone, job_id, job_title,
       cover_letter, privacy_consent, cv
       ======================================================== */

    async function submitApplication(form) {
        if (state.submitting) return;

        const statusElement = $(SELECTORS.applicationStatus);

        if (!form.reportValidity()) {
            return;
        }

        const values = validateForm(form);

        if (values.error) {
            showMessage(statusElement, values.error, "error");
            return;
        }

        const formData = new FormData();

        formData.append("full_name", values.name);
        formData.append("email", values.email);
        formData.append("phone", values.phone);
        formData.append("job_id", values.jobId);
        formData.append("job_title", values.jobTitle);
        formData.append("cover_letter", values.coverLetter);
        formData.append("privacy_consent", "true");
        formData.append("cv", values.file);

        setSubmitting(form, true);

        showMessage(
            statusElement,
            "Submitting your application securely...",
            "info"
        );

        try {
            const result = await apiRequest(
                CONFIG.applicationsEndpoint,
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!result || result.success !== true) {
                throw new Error(
                    "The server did not confirm that your application was received. Please contact AVERRA before trying again."
                );
            }

            showMessage(
                statusElement,
                result.message ||
                    "Thank you. Your application has been received.",
                "success"
            );

            form.reset();

            // Restore the vacancy placeholder after resetting the form.
            const jobSelect = $(SELECTORS.job, form);

            if (jobSelect) {
                jobSelect.value = "";
            }

            form.dispatchEvent(
                new CustomEvent("averra:application-submitted", {
                    bubbles: true,
                    detail: {
                        applicationId: result.application_id ?? null,
                        result
                    }
                })
            );
        } catch (error) {
            console.error(
                "[AVERRA] Application submission failed:",
                error
            );

            showMessage(
                statusElement,
                error.message ||
                    "We could not submit your application. Please try again later.",
                "error"
            );
        } finally {
            setSubmitting(form, false);
        }
    }

    /* ========================================================
       INITIALIZATION
       ======================================================== */

    function initialize() {
        const form = $(SELECTORS.form);

        const cvInput = form
            ? $(SELECTORS.cv, form)
            : null;

        if (cvInput) {
            cvInput.setAttribute(
                "accept",
                ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
        }

        if (form && form.dataset.averraInitialized !== "true") {
            form.dataset.averraInitialized = "true";

            form.addEventListener("submit", event => {
                event.preventDefault();
                submitApplication(form);
            });
        }

        const searchInput = $(SELECTORS.search);
        const categorySelect = $(SELECTORS.category);

        searchInput?.addEventListener("input", filterJobs);
        categorySelect?.addEventListener("change", filterJobs);

        const year = $("#current-year");

        if (year) {
            year.textContent = String(new Date().getFullYear());
        }

        loadJobs();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }

    /* ========================================================
       PUBLIC METHODS FOR TESTING
       ======================================================== */

    window.AVERRAApplications = Object.freeze({
        reloadJobs: () => loadJobs(true),

        getConfig: () => ({
            apiBaseUrl: CONFIG.apiBaseUrl,
            jobsEndpoint: CONFIG.jobsEndpoint,
            applicationsEndpoint: CONFIG.applicationsEndpoint,
            maxCvSize: CONFIG.maxCvSize
        })
    });
})();
