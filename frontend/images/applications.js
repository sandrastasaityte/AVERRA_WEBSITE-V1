
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: frontend/images/applications.js
   Version: 7.0.0

   RESPONSIBILITIES
   - Validate candidate details and CV files
   - Submit applications to POST /api/applications
   - Display success and error messages
   - Keep the submit button state consistent
   - Expose a small public API for application testing

   VACANCY MANAGEMENT
   Handled by images/jobs.js.
   This file does NOT fetch, filter or render vacancies.

   BACKEND
   https://averra-backend-dn23.onrender.com

   EXPECTED MULTIPART FIELDS
   full_name, email, phone, job_id, job_title,
   cover_letter, privacy_consent, cv
   ============================================================ */

(() => {
    const CONFIG = Object.freeze({
        apiBaseUrl:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        applicationsEndpoint: "/api/applications",

        requestTimeout: 20000,
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
        submitting: false
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    function apiUrl(endpoint) {
        return (
            String(CONFIG.apiBaseUrl).replace(/\/+$/, "") +
            endpoint
        );
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
                    if (response.ok) {
                        throw new Error(
                            "The server returned an unexpected response. Please contact AVERRA before submitting again."
                        );
                    }

                    throw new Error(
                        "The server could not process your request. Please try again later."
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
                                item?.msg || "Invalid information"
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
                    "The request timed out. Please try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the AVERRA server. Please check your connection and try again."
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
        const phone = (phoneInput?.value || "").trim();
        const coverLetter = (
            coverLetterInput?.value || ""
        ).trim();

        if (!name) {
            return { error: "Please enter your full name." };
        }

        if (name.length > 150) {
            return {
                error: "Your name must be 150 characters or fewer."
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

        if (phone.length > 40) {
            return {
                error: "Your phone number must be 40 characters or fewer."
            };
        }

        if (coverLetter.length > 5000) {
            return {
                error:
                    "Your cover letter must be no longer than 5,000 characters."
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

        return {
            name,
            email,
            phone,
            coverLetter,
            file,
            jobId: jobInput.value,
            jobTitle:
                selectedOption.dataset.jobTitle ||
                selectedOption.textContent.trim()
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
                button.dataset.originalText = button.textContent;
            }

            button.disabled = true;
            button.textContent = "Submitting application...";
            button.setAttribute("aria-busy", "true");
        } else {
            button.disabled = false;
            button.removeAttribute("aria-busy");

            if (button.dataset.originalText !== undefined) {
                button.textContent = button.dataset.originalText;
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
        formData.append("cv", values.file, values.file.name);

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

            /*
             * Do not report success unless the backend explicitly
             * confirms it. The backend response format must match.
             */
            if (!result || result.success !== true) {
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

            /*
             * Restore the placeholder after reset. Do not rebuild
             * the options here: jobs.js owns the vacancy dropdown.
             */
            if (jobSelect) {
                jobSelect.value = "";
            }

            form.dispatchEvent(
                new CustomEvent("averra:application-submitted", {
                    bubbles: true,
                    detail: {
                        applicationId:
                            result.application_id ?? null,
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
                    "We could not submit your application. Please try again later or contact " +
                    CONFIG.contactEmail + ".",
                "error"
            );
        } finally {
            setSubmitting(form, false);
        }
    }

    /* ========================================================
       INITIALIZATION
       This file does not attach vacancy-search listeners.
       images/jobs.js owns vacancy loading and filtering.
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

        if (
            form &&
            form.dataset.averraApplicationInitialized !== "true"
        ) {
            form.dataset.averraApplicationInitialized = "true";

            form.addEventListener("submit", event => {
                event.preventDefault();
                submitApplication(form);
            });
        }

        const year = $(SELECTORS.year);

        if (year) {
            year.textContent = String(new Date().getFullYear());
        }
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
            maxCvSize: CONFIG.maxCvSize
        }),

        getStatus: () => ({
            submitting: state.submitting
        }),

        initialize
    });
})();
