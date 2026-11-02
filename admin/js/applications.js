
/*
 * AVERRA STAFFING SOLUTIONS LTD
 * File: admin/js/applications.js
 * Version: 1.1.0
 *
 * Administrator application management.
 *
 * Required backend endpoints:
 * GET    /api/admin/applications
 * GET    /api/admin/applications/{id}
 * PATCH  /api/admin/applications/{id}
 * GET    /api/admin/applications/{id}/cv
 * DELETE /api/admin/applications/{id}
 *
 * Compatible with admin/js/auth.js v3.8.0.
 */

"use strict";

(() => {
    const API_BASE_URL = (
        window.AVERRA_ADMIN?.API_BASE_URL ||
        window.AVERRA_API_BASE_URL ||
        "https://averra-backend-dn23.onrender.com"
    ).replace(/\/+$/, "");

    const STATUS_OPTIONS = [
        "new",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired",
        "withdrawn"
    ];

    const state = {
        applications: [],
        filteredApplications: [],
        selectedApplication: null,
        loading: false
    };

    const elements = {};

    function getElement(id) {
        return document.getElementById(id);
    }


function cacheElements() {
    elements.tableBody =
        getElement("applications-table-body") ||
        getElement("applications-body") ||
        getElement("applications-list") ||
        document.querySelector("#applications-table tbody") ||
        document.querySelector("#applications tbody") ||
        document.querySelector("table tbody");

    elements.search = getElement("application-search");
    elements.statusFilter = getElement("status-filter");
    elements.refreshButton = getElement("refresh-applications");
    elements.loading = getElement("applications-loading");
    elements.error = getElement("applications-error");
    elements.empty = getElement("applications-empty");
    elements.count = getElement("applications-count");

    elements.modal = getElement("application-modal");
    elements.modalContent = getElement("application-details");
    elements.modalClose = getElement("close-application-modal");

    elements.detailName = getElement("detail-name");
    elements.detailEmail = getElement("detail-email");
    elements.detailPhone = getElement("detail-phone");
    elements.detailJob = getElement("detail-job");
    elements.detailDate = getElement("detail-date");
    elements.detailStatus = getElement("detail-status");
    elements.detailCoverLetter = getElement("detail-cover-letter");
    elements.detailCv = getElement("detail-cv");

    elements.saveStatusButton = getElement("save-application-status");
    elements.deleteButton = getElement("delete-application");
}

    function showMessage(message, type = "error") {
        if (!elements.error) {
            if (type === "error") {
                console.error(message);
            } else {
                console.info(message);
            }
            return;
        }

        elements.error.textContent = message;
        elements.error.hidden = false;
        elements.error.className = `alert alert-${type}`;
    }

    function clearMessage() {
        if (!elements.error) return;

        elements.error.textContent = "";
        elements.error.hidden = true;
    }

    function setLoading(loading) {
        state.loading = loading;

        if (elements.loading) {
            elements.loading.hidden = !loading;
        }

        if (elements.refreshButton) {
            elements.refreshButton.disabled = loading;
        }
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatFileSize(bytes) {
        const size = Number(bytes);

        if (!Number.isFinite(size) || size < 0) {
            return "Unknown size";
        }

        if (size < 1024) {
            return `${size} bytes`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    function normaliseStatus(status) {
        const value = String(status || "new").toLowerCase();

        return STATUS_OPTIONS.includes(value) ? value : "new";
    }

    function statusLabel(status) {
        const labels = {
            new: "New",
            reviewing: "Reviewing",
            shortlisted: "Shortlisted",
            rejected: "Rejected",
            hired: "Hired",
            withdrawn: "Withdrawn"
        };

        return labels[normaliseStatus(status)];
    }

    function createStatusBadge(status) {
        const badge = document.createElement("span");
        const value = normaliseStatus(status);

        badge.className = `status status-${value}`;
        badge.textContent = statusLabel(value);

        return badge;
    }

    function createButton(label, className, onClick) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.addEventListener("click", onClick);

        return button;
    }

    /*
     * IMPORTANT:
     * auth.js v3.8.0 returns parsed JSON, not a Response object.
     */
    async function apiRequest(path, options = {}) {
        if (
            !window.AVERRA_ADMIN ||
            typeof window.AVERRA_ADMIN.api !== "function"
        ) {
            throw new Error(
                "AVERRA authentication is unavailable. " +
                "Check that auth.js loads before applications.js."
            );
        }

        return window.AVERRA_ADMIN.api(path, {
            method: options.method || "GET",
            headers: options.headers || {},
            body: options.body
        });
    }

    async function ensureAuthenticated() {
        if (
            !window.AVERRA_ADMIN ||
            typeof window.AVERRA_ADMIN.requireLogin !== "function"
        ) {
            throw new Error(
                "AVERRA administrator authentication is unavailable."
            );
        }

        return await window.AVERRA_ADMIN.requireLogin();
    }

    function unwrapApplication(data) {
        if (!data || typeof data !== "object") {
            return data;
        }

        return data.application || data.item || data;
    }

    function unwrapApplications(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.applications)) {
            return data.applications;
        }

        if (Array.isArray(data?.items)) {
            return data.items;
        }

        if (Array.isArray(data?.results)) {
            return data.results;
        }

        return [];
    }

    async function loadApplications() {
        clearMessage();

        try {
            const authenticated = await ensureAuthenticated();

            if (!authenticated) return;

            setLoading(true);

            const data = await apiRequest(
                "/api/admin/applications?limit=200&offset=0"
            );

            state.applications = unwrapApplications(data);

            applyFilters();

        } catch (error) {
            console.error("AVERRA applications:", error);

            showMessage(
                error.message || "Unable to load applications."
            );

        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        const searchTerm = elements.search
            ? elements.search.value.trim().toLowerCase()
            : "";

        const selectedStatus = elements.statusFilter
            ? elements.statusFilter.value
            : "all";

        state.filteredApplications =
            state.applications.filter(application => {
                const status = normaliseStatus(application.status);

                if (
                    selectedStatus !== "all" &&
                    status !== selectedStatus
                ) {
                    return false;
                }

                const searchable = [
                    application.id,
                    application.full_name,
                    application.email,
                    application.phone,
                    application.job_title
                ].join(" ").toLowerCase();

                return searchable.includes(searchTerm);
            });

        renderApplications();
    }

    function renderApplications() {
        if (!elements.tableBody) {
            console.error(
                "Applications table body not found. " +
                "Expected #applications-table-body."
            );
            return;
        }

        elements.tableBody.replaceChildren();

        if (elements.count) {
            elements.count.textContent =
                `${state.filteredApplications.length} application(s)`;
        }

        if (elements.empty) {
            elements.empty.hidden =
                state.filteredApplications.length !== 0;
        }

        state.filteredApplications.forEach(application => {
            const row = document.createElement("tr");

            const idCell = document.createElement("td");
            idCell.textContent = `#${application.id ?? "—"}`;

            const applicantCell = document.createElement("td");

            const applicantName = document.createElement("strong");
            applicantName.textContent =
                application.full_name || "Unknown applicant";

            const applicantEmail = document.createElement("small");
            applicantEmail.textContent =
                application.email || "No email";

            applicantCell.append(
                applicantName,
                document.createElement("br"),
                applicantEmail
            );

            const jobCell = document.createElement("td");
            jobCell.textContent =
                application.job_title || "General Application";

            const dateCell = document.createElement("td");
            dateCell.textContent = formatDate(application.created_at);

            const statusCell = document.createElement("td");
            statusCell.appendChild(
                createStatusBadge(application.status)
            );

            const actionsCell = document.createElement("td");

            const viewButton = createButton(
                "View",
                "btn btn-primary btn-small",
                () => openApplication(application.id)
            );

            actionsCell.appendChild(viewButton);

            row.append(
                idCell,
                applicantCell,
                jobCell,
                dateCell,
                statusCell,
                actionsCell
            );

            elements.tableBody.appendChild(row);
        });
    }

    async function openApplication(applicationId) {
        clearMessage();

        try {
            const authenticated = await ensureAuthenticated();

            if (!authenticated) return;

            /*
             * Load full application details from the backend.
             */
            const data = await apiRequest(
                `/api/admin/applications/${encodeURIComponent(applicationId)}`
            );

            const application = unwrapApplication(data);

            if (!application) {
                throw new Error("Application details were not returned.");
            }

            state.selectedApplication = application;

            displayApplicationDetails(application);

            if (elements.modal) {
                elements.modal.hidden = false;
                elements.modal.setAttribute("aria-hidden", "false");
            }

        } catch (error) {
            console.error(error);

            showMessage(
                error.message || "Unable to open application."
            );
        }
    }

    function displayApplicationDetails(application) {
        const setText = (element, value) => {
            if (element) {
                element.textContent = value || "—";
            }
        };

        setText(elements.detailName, application.full_name);
        setText(elements.detailEmail, application.email);
        setText(elements.detailPhone, application.phone);
        setText(elements.detailJob, application.job_title);
        setText(elements.detailDate, formatDate(application.created_at));

        setText(
            elements.detailCoverLetter,
            application.cover_letter || "No cover letter provided."
        );

        if (elements.detailStatus) {
            elements.detailStatus.value =
                normaliseStatus(application.status);
        }

        if (elements.detailCv) {
            elements.detailCv.textContent =
                application.cv_original_name
                    ? `${application.cv_original_name} (${formatFileSize(application.cv_size)})`
                    : "No CV information available.";

            elements.detailCv.disabled =
                !application.cv_original_name;
        }
    }

    async function saveApplicationStatus() {
        const application = state.selectedApplication;

        if (!application) {
            showMessage("Select an application first.");
            return;
        }

        const newStatus = elements.detailStatus
            ? normaliseStatus(elements.detailStatus.value)
            : normaliseStatus(application.status);

        if (!STATUS_OPTIONS.includes(newStatus)) {
            showMessage("Please select a valid application status.");
            return;
        }

        try {
            const authenticated = await ensureAuthenticated();

            if (!authenticated) return;

            if (elements.saveStatusButton) {
                elements.saveStatusButton.disabled = true;
            }

            const data = await apiRequest(
                `/api/admin/applications/${encodeURIComponent(application.id)}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            const updated = unwrapApplication(data) || {};

            const index = state.applications.findIndex(
                item => Number(item.id) === Number(application.id)
            );

            if (index !== -1) {
                state.applications[index] = {
                    ...state.applications[index],
                    ...updated,
                    status: newStatus
                };

                state.selectedApplication =
                    state.applications[index];
            } else {
                state.selectedApplication = {
                    ...application,
                    ...updated,
                    status: newStatus
                };
            }

            displayApplicationDetails(
                state.selectedApplication
            );

            applyFilters();

            showMessage(
                "Application status updated successfully.",
                "success"
            );

        } catch (error) {
            console.error(error);

            showMessage(
                error.message ||
                "Unable to update application status."
            );

        } finally {
            if (elements.saveStatusButton) {
                elements.saveStatusButton.disabled = false;
            }
        }
    }

    /*
     * CV download requires a raw fetch because auth.js api()
     * parses successful responses as JSON.
     */
    async function downloadCv() {
        const application = state.selectedApplication;

        if (!application) {
            showMessage("Select an application first.");
            return;
        }

        if (!application.cv_original_name) {
            showMessage("No CV is available for this application.");
            return;
        }

        try {
            const authenticated = await ensureAuthenticated();

            if (!authenticated) return;

            const token = window.AVERRA_ADMIN.getToken();

            if (!token) {
                throw new Error(
                    "Your administrator session has expired. Please sign in again."
                );
            }

            const url =
                `${API_BASE_URL}/api/admin/applications/` +
                `${encodeURIComponent(application.id)}/cv`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "X-Admin-Token": token
                },
                credentials: "omit",
                cache: "no-store"
            });

            if (!response.ok) {
                let message = "Unable to download this CV.";

                try {
                    const result = await response.json();

                    if (result.detail) {
                        message = typeof result.detail === "string"
                            ? result.detail
                            : JSON.stringify(result.detail);
                    }
                } catch (_) {
                    // Keep fallback message.
                }

                throw new Error(message);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = objectUrl;
            link.download =
                application.cv_original_name || "applicant-cv";

            document.body.appendChild(link);
            link.click();
            link.remove();

            /*
             * Revoke after the browser has initiated the download.
             */
            window.setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 1000);

        } catch (error) {
            console.error(error);

            showMessage(
                error.message || "Unable to download CV."
            );
        }
    }

    async function deleteApplication() {
        const application = state.selectedApplication;

        if (!application) {
            showMessage("Select an application first.");
            return;
        }

        const confirmed = window.confirm(
            `Permanently delete application #${application.id} and its stored CV? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const authenticated = await ensureAuthenticated();

            if (!authenticated) return;

            await apiRequest(
                `/api/admin/applications/${encodeURIComponent(application.id)}`,
                {
                    method: "DELETE"
                }
            );

            state.applications = state.applications.filter(
                item => Number(item.id) !== Number(application.id)
            );

            state.selectedApplication = null;

            closeModal();
            applyFilters();

            showMessage(
                "Application and stored CV deleted.",
                "success"
            );

        } catch (error) {
            console.error(error);

            showMessage(
                error.message || "Unable to delete application."
            );
        }
    }

    function closeModal() {
        if (!elements.modal) return;

        elements.modal.hidden = true;
        elements.modal.setAttribute("aria-hidden", "true");

        state.selectedApplication = null;
    }

    function bindEvents() {
        if (elements.search) {
            elements.search.addEventListener(
                "input",
                applyFilters
            );
        }

        if (elements.statusFilter) {
            elements.statusFilter.addEventListener(
                "change",
                applyFilters
            );
        }

        if (elements.refreshButton) {
            elements.refreshButton.addEventListener(
                "click",
                loadApplications
            );
        }

        if (elements.modalClose) {
            elements.modalClose.addEventListener(
                "click",
                closeModal
            );
        }

        if (elements.saveStatusButton) {
            elements.saveStatusButton.addEventListener(
                "click",
                saveApplicationStatus
            );
        }

        if (elements.deleteButton) {
            elements.deleteButton.addEventListener(
                "click",
                deleteApplication
            );
        }

        if (elements.detailCv) {
            elements.detailCv.addEventListener(
                "click",
                downloadCv
            );
        }

        if (elements.modal) {
            elements.modal.addEventListener(
                "click",
                event => {
                    if (event.target === elements.modal) {
                        closeModal();
                    }
                }
            );
        }

        document.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    closeModal();
                }
            }
        );
    }

    async function initialise() {
        cacheElements();

        if (!elements.tableBody) {
            console.error(
                "AVERRA Applications: applications table body is missing."
            );
            return;
        }

        bindEvents();

        await loadApplications();
    }

    document.addEventListener(
        "DOMContentLoaded",
        initialise,
        { once: true }
    );

})();
