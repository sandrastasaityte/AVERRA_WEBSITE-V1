
"use strict";

/*
 * AVERRA STAFFING SOLUTIONS LTD
 * File: frontend/images/applications.js
 * Handles the CV application form and vacancy selection.
 */

(() => {
    const API_BASE = String(
        window.AVERRA_API_BASE_URL ||
        window.location.origin
    ).replace(/\/+$/, "");

    const MAX_CV_SIZE = 5 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

    const form = document.getElementById("cv-application-form");
    const jobSelect = document.getElementById("applicant-role");
    const fileInput = document.getElementById("applicant-cv");
    const statusElement = document.getElementById("cv-application-status");
    const submitButton = document.getElementById("cv-submit-button");
    const grid = document.getElementById("jobs-grid");

    if (!form || !jobSelect || !fileInput || !statusElement) {
        console.warn(
            "AVERRA applications: required application form elements were not found."
        );
        return;
    }

    function showStatus(message, type = "info") {
        statusElement.textContent = message;
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
        statusElement.dataset.state = type;
    }

    function setSubmitting(isSubmitting) {
        if (!submitButton) return;

        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting
            ? "Submitting application..."
            : "Submit Application";
    }

    function populateVacancyOptions(jobs) {
        const previousValue = jobSelect.value;

        jobSelect.replaceChildren();

        const generalOption = document.createElement("option");
        generalOption.value = "general";
        generalOption.textContent = "General Application";
        jobSelect.appendChild(generalOption);

        for (const job of jobs) {
            if (!job || job.id == null || !job.title) continue;

            const option = document.createElement("option");
            option.value = String(job.id);
            option.textContent = String(job.title);
            jobSelect.appendChild(option);
        }

        if (
            previousValue &&
            Array.from(jobSelect.options).some(
                option => option.value === previousValue
            )
        ) {
            jobSelect.value = previousValue;
        }
    }

    let availableJobs = [];

    async function loadVacancies() {
        try {
            const response = await fetch(
                `${API_BASE}/api/jobs?limit=100`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );

            if (!response.ok) {
                throw new Error(`Vacancy request failed (${response.status}).`);
            }

            const result = await response.json();
            availableJobs = Array.isArray(result) ? result : [];

            populateVacancyOptions(availableJobs);
            populateCategories(availableJobs);
            applyVacancyFilters();
        } catch (error) {
            console.error("AVERRA applications: could not load vacancies.", error);
            populateVacancyOptions([]);
            showStatus(
                "Vacancies could not be loaded. You can still select General Application and try again.",
                "warning"
            );
        }
    }

    const searchInput = document.getElementById("job-search");
    const categorySelect = document.getElementById("job-category");
    const resetButton = document.getElementById("reset-jobs");

    function populateCategories(jobs) {
        if (!categorySelect) return;

        const selected = categorySelect.value;
        const categories = [...new Set(
            jobs
                .map(job => String(job.department || job.category || "").trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        categorySelect.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All categories";
        categorySelect.appendChild(allOption);

        for (const category of categories) {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        }

        if (categories.includes(selected)) {
            categorySelect.value = selected;
        }
    }

    function getCardJob(card) {
        const titleElement = card.querySelector(
            ".job-card__title, h3, h2"
        );

        const title = titleElement
            ? titleElement.textContent.trim()
            : "";

        return availableJobs.find(
            job => String(job.title || "").trim() === title
        );
    }

    function applyVacancyFilters() {
        if (!grid) return;

        const query = (searchInput?.value || "").trim().toLowerCase();
        const category = categorySelect?.value || "";

        const cards = grid.querySelectorAll(".job-card");

        cards.forEach(card => {
            const job = getCardJob(card);
            const text = card.textContent.toLowerCase();

            const matchesSearch = !query || text.includes(query);
            const jobCategory = String(
                job?.department || job?.category || ""
            ).trim();

            const matchesCategory =
                !category || jobCategory === category;

            card.hidden = !(matchesSearch && matchesCategory);
        });

        const visibleCount = Array.from(cards).filter(
            card => !card.hidden
        ).length;

        const countElement = document.getElementById("jobs-results-count");

        if (countElement) {
            countElement.textContent = `${visibleCount} ${
                visibleCount === 1 ? "vacancy" : "vacancies"
            }`;
        }
    }

    searchInput?.addEventListener("input", applyVacancyFilters);
    categorySelect?.addEventListener("change", applyVacancyFilters);

    resetButton?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (categorySelect) categorySelect.value = "";
        applyVacancyFilters();
    });

    if (grid && typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(() => {
            applyVacancyFilters();
        });

        observer.observe(grid, {
            childList: true,
            subtree: true
        });
    }

    /*
     * Capture the submit event before the older jobs.js submit handler.
     * This prevents the old "applications are not enabled" message.
     */
    form.addEventListener("submit", async event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!form.reportValidity()) return;

        const file = fileInput.files?.[0];

        if (!file) {
            showStatus("Please select your CV.", "error");
            return;
        }

        const extension = file.name.split(".").pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(extension)) {
            showStatus("Please upload a PDF, DOC or DOCX file.", "error");
            return;
        }

        if (file.size > MAX_CV_SIZE) {
            showStatus("Your CV must be no larger than 5 MB.", "error");
            return;
        }

        if (file.size === 0) {
            showStatus("The selected CV file is empty.", "error");
            return;
        }

        const consent = document.getElementById("applicant-privacy");

        if (!consent?.checked) {
            showStatus(
                "Please confirm your privacy consent before submitting.",
                "error"
            );
            consent?.focus();
            return;
        }

        const formData = new FormData(form);

        // Ensure a consistent value for the general application option.
        if (!jobSelect.value) {
            formData.set("job_id", "general");
        }

        setSubmitting(true);
        showStatus("Uploading your application securely...", "info");

        try {
            const response = await fetch(
                `${API_BASE}/api/applications`,
                {
                    method: "POST",
                    headers: { Accept: "application/json" },
                    body: formData
                }
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.detail ||
                    result.message ||
                    `Application submission failed (${response.status}).`
                );
            }

            if (result.notification_sent === false) {
                showStatus(
                    result.message ||
                    "Your application was saved, but the email notification failed. Please contact info@averrastaffing.co.uk.",
                    "warning"
                );
            } else {
                showStatus(
                    result.message ||
                    "Thank you. Your application has been received.",
                    "success"
                );

                form.reset();
                await loadVacancies();
            }
        } catch (error) {
            console.error("AVERRA application submission failed.", error);

            showStatus(
                error.message ||
                "We could not submit your application. Please try again.",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }, true);

    /*
     * Make "How to Apply" buttons select the corresponding vacancy
     * and move the applicant to the application form.
     */
    document.addEventListener("click", event => {
        const button = event.target.closest("button, a");

        if (!button || button.textContent.trim() !== "How to Apply") {
            return;
        }

        const card = button.closest(".job-card");

        if (!card) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const titleElement = card.querySelector(
            ".job-card__title, h3, h2"
        );

        const title = titleElement?.textContent.trim() || "";

        const matchingJob = availableJobs.find(
            job => String(job.title || "").trim() === title
        );

        if (matchingJob) {
            jobSelect.value = String(matchingJob.id);
        }

        const applicationSection =
            document.getElementById("submit-cv") || form;

        applicationSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        jobSelect.focus({ preventScroll: true });
    }, true);

    loadVacancies();
})();
