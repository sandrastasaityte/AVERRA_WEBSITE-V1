
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: frontend/images/applications.js
   Version: 7.2.0

   Compatible with backend/main.py v4.6.0.

   RESPONSIBILITIES
   - Validate application details and CV files
   - Submit multipart applications
   - Prevent duplicate submissions
   - Handle network errors and timeouts
   - Display application status
   - Expose a public testing API

   VACANCIES
   Managed by images/jobs.js.

   BACKEND
   https://averra-backend-dn23.onrender.com
   ============================================================ */

(() => {
    const CONFIG = Object.freeze({
        apiBaseUrl:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        applicationsEndpoint: "/api/applications",

        requestTimeout: 30000,

        maxCvSize: 5 * 1024 * 1024,

        acceptedExtensions: [".pdf", ".doc", ".docx"],

        acceptedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",
            "binary/octet-stream"
        ],

        contactEmail: "enquiries@averrastaffing.co.uk"
    });

    const SELECTORS = Object.freeze({
        form: "#cv-application-form",
        status: "#cv-application-status",
        submit: "#cv-submit-button",

        name: "#applicant-name",
        email: "#applicant-email",
        phone: "#applicant-phone",
        job: "#applicant-role",
        coverLetter: "#applicant-cover-letter",
        cv: "#applicant-cv",
        privacy: "#applicant-privacy",

        year: "#current-year"
    });

    const state = {
        submitting: false,
        initialized: false
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    function apiUrl(endpoint) {
        return (
            String(CONFIG.apiBaseUrl).replace(/\/+$/, "") +
            endpoint
        );
    }

    /* ========================================================
       STATUS MESSAGES
       ======================================================== */

    function showMessage(element, message, type = "info") {
        if (!element) {
            if (message) {
                console.info("[AVERRA]", message);
            }

            return;
        }

        element.textContent = message;

        element.className = "application-status " + type;

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

    /* ========================================================
       API REQUEST
       ======================================================== */

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
                        response.ok
                            ? "The server returned an unexpected response. Please contact AVERRA."
                            : "The server could not process your request. Please try again later."
                    );
                }
            }

            if (!response.ok) {
                const detail =
                    data?.detail ??
                    data?.message ??
                    data?.error ??
                    `The server returned HTTP ${response.status}.`;

                if (Array.isArray(detail)) {
                    throw new Error(
                        detail
                            .map(item =>
                                item?.msg ||
                                "Please check the information provided."
                            )
                            .join(" ")
                    );
                }

                throw new Error(String(detail));
            }

            return data;

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "The request timed out. Please contact AVERRA before submitting again if you are unsure whether your application was received."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the AVERRA server. Please check your internet connection and try again."
                );
            }

            throw error;

        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    /* ========================================================
       VALIDATION
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

        const extension =
            dot >= 0
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

        if (
            !nameInput ||
            !emailInput ||
            !jobInput ||
            !cvInput ||
            !privacyInput
        ) {
            return {
                error:
                    "The application form is incomplete. Please refresh the page or contact AVERRA."
            };
        }

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        const phone =
            (phoneInput?.value || "").trim();

        const coverLetter =
            (coverLetterInput?.value || "").trim();

        if (!name || name.length > 150) {
            return {
                error:
                    "Please enter your full name using no more than 150 characters."
            };
        }

        if (
            !email ||
            email.length > 254 ||
            !validateEmail(email)
        ) {
            return {
                error: "Please enter a valid email address."
            };
        }

        if (phone.length > 50) {
            return {
                error:
                    "Your phone number must be 50 characters or fewer."
            };
        }

        if (coverLetter.length > 10000) {
            return {
                error:
                    "Your cover letter must be no longer than 10,000 characters."
            };
        }

        if (!jobInput.value) {
            return {
                error:
                    "Please select a vacancy or General Application."
            };
        }

        const selectedOption =
            jobInput.options[jobInput.selectedIndex];

        if (!selectedOption) {
            return {
                error: "Please select a valid vacancy."
            };
        }

        const file = cvInput.files?.[0];

        const cvError = validateCv(file);

        if (cvError) {
            return { error: cvError };
        }

        if (!privacyInput.checked) {
            return {
                error:
                    "Please confirm that you have read the Privacy Policy."
            };
        }

        const selectedValue =
            String(jobInput.value).trim();

        const isGeneralApplication = [
            "",
            "general",
            "other"
        ].includes(selectedValue.toLowerCase());

        return {
            name,
            email,
            phone,
            coverLetter,
            file,

            jobId: isGeneralApplication
                ? ""
                : selectedValue,

            jobTitle: isGeneralApplication
                ? "General Application"
                : (
                    selectedOption.dataset.jobTitle ||
                    selectedOption.textContent.trim()
                )
        };
    }

    /* ========================================================
       SUBMIT BUTTON STATE
       ======================================================== */

    function setSubmitting(form, isSubmitting) {
        state.submitting = isSubmitting;

        const button = $(SELECTORS.submit, form);

        if (!button) return;

        if (isSubmitting) {
            if (button.dataset.originalText === undefined) {
                button.dataset.originalText =
                    button.textContent;
            }

            button.disabled = true;

            button.textContent =
                "Submitting application...";

            button.setAttribute("aria-busy", "true");

        } else {
            button.disabled = false;

            button.removeAttribute("aria-busy");

            if (button.dataset.originalText !== undefined) {
                button.textContent =
                    button.dataset.originalText;

                delete button.dataset.originalText;
            }
        }
    }

    /* ========================================================
       SUBMIT APPLICATION
       ======================================================== */

    async function submitApplication(form) {
        if (state.submitting) return;

        const statusElement = $(SELECTORS.status);

        if (!form.reportValidity()) return;

        const values = validateForm(form);

        if (values.error) {
            showMessage(
                statusElement,
                values.error,
                "error"
            );

            return;
        }

        const formData = new FormData();

        formData.append("full_name", values.name);
        formData.append("email", values.email);
        formData.append("phone", values.phone);

        // Backend v4.6.0 expects blank for General Application.
        formData.append("job_id", values.jobId);

        formData.append("job_title", values.jobTitle);
        formData.append("cover_letter", values.coverLetter);
        formData.append("privacy_consent", "true");

        formData.append(
            "cv",
            values.file,
            values.file.name
        );

        setSubmitting(form, true);

        hideMessage(statusElement);

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

            if (
                !result ||
                result.success !== true ||
                result.application_id == null
            ) {
                throw new Error(
                    "The server did not confirm receipt of your application. Please contact AVERRA before trying again."
                );
            }

            showMessage(
                statusElement,

                result.message ||
                    "Thank you. Your application has been received.",

                "success"
            );

            form.reset();

            const jobSelect = $(SELECTORS.job, form);

            if (jobSelect) {
                jobSelect.value = "";
            }

            form.dispatchEvent(
                new CustomEvent(
                    "averra:application-submitted",
                    {
                        bubbles: true,

                        detail: {
                            applicationId:
                                result.application_id,

                            result
                        }
                    }
                )
            );

        } catch (error) {
            console.error(
                "[AVERRA] Application submission failed:",
                error
            );

            showMessage(
                statusElement,

                error.message ||
                    "We could not submit your application. Please contact " +
                    CONFIG.contactEmail +
                    ".",

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

        if (!form) {
            return;
        }

        const cvInput = $(SELECTORS.cv, form);

        if (cvInput) {
            cvInput.setAttribute(
                "accept",
                ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
        }

        if (
            form.dataset.averraApplicationInitialized === "true"
        ) {
            return;
        }

        form.dataset.averraApplicationInitialized = "true";

        /*
         * Capture-phase handler:
         * prevents an existing homepage inline/bubble handler
         * from submitting the same form a second time.
         */

        form.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                event.stopImmediatePropagation();

                submitApplication(form);
            },
            true
        );

        const year = $(SELECTORS.year);

        if (year) {
            year.textContent =
                String(new Date().getFullYear());
        }

        state.initialized = true;
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
       PUBLIC API
       ======================================================== */

    window.AVERRAApplications = Object.freeze({
        getConfig: () => ({
            apiBaseUrl: CONFIG.apiBaseUrl,
            applicationsEndpoint: CONFIG.applicationsEndpoint,
            maxCvSize: CONFIG.maxCvSize,
            contactEmail: CONFIG.contactEmail
        }),

        getStatus: () => ({
            submitting: state.submitting,
            initialized: state.initialized
        }),

        initialize,

        submit: () => {
            const form = $(SELECTORS.form);

            if (form) {
                return submitApplication(form);
            }

            return Promise.reject(
                new Error("Application form not found.")
            );
        }
    });

})();
