
/**
 * AVERRA STAFFING SOLUTIONS LTD
 * File: admin/js/dashboard.js
 * Version: 3.1.0
 *
 * Requires:
 *   admin/js/auth.js
 *
 * Backend:
 *   GET /api/admin/dashboard/stats
 *   GET /api/admin/jobs
 */

(function () {
    "use strict";

    const admin = window.AVERRA_ADMIN;

    if (
        !admin ||
        typeof admin.api !== "function" ||
        typeof admin.requireLogin !== "function"
    ) {
        console.error(
            "AVERRA_ADMIN is unavailable. Check that auth.js loads first."
        );
        return;
    }

    const elements = {
        message: document.getElementById("dashboard-message"),
        refresh: document.getElementById("refresh-dashboard"),

        totalJobs: document.getElementById("total-jobs"),
        publishedJobs: document.getElementById("published-jobs"),
        draftJobs: document.getElementById("draft-jobs"),
        totalApplications: document.getElementById("total-applications"),

        recentJobs: document.getElementById("recent-jobs"),
        recentJobsEmpty: document.getElementById("recent-jobs-empty")
    };

    let loading = false;

    // ------------------------------------------------------------
    // MESSAGES
    // ------------------------------------------------------------

    function showMessage(message, type = "error") {
        if (!elements.message) return;

        elements.message.textContent = String(message || "");
        elements.message.className = "message";

        if (type) {
            elements.message.classList.add(type);
        }

        elements.message.hidden = false;
    }

    function clearMessage() {
        if (!elements.message) return;

        elements.message.textContent = "";
        elements.message.hidden = true;
        elements.message.className = "message";
    }

    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    function setText(element, value) {
        if (element) {
            element.textContent = String(value ?? "—");
        }
    }

    function formatNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number) || number < 0) {
            return "—";
        }

        return Math.floor(number).toLocaleString("en-GB");
    }

    function getJobsArray(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.jobs)) return response.jobs;
        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response?.results)) return response.results;

        throw new Error(
            "The vacancies API returned an unexpected response format."
        );
    }

    function getJobId(job) {
        return job?.id ?? job?.job_id ?? null;
    }

    function getJobTitle(job) {
        return job?.title || job?.job_title || "Untitled vacancy";
    }

    function getJobLocation(job) {
        return job?.location ||
            job?.location_name ||
            "Location not specified";
    }

    function getJobStatus(job) {
        return String(job?.status || "unknown")
            .trim()
            .toLowerCase();
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showRecentJobsMessage(message) {
        if (!elements.recentJobs) return;

        elements.recentJobs.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = message;

        row.appendChild(cell);
        elements.recentJobs.appendChild(row);

        if (elements.recentJobsEmpty) {
            elements.recentJobsEmpty.hidden = true;
        }
    }

    // ------------------------------------------------------------
    // RECENT VACANCIES
    // ------------------------------------------------------------

    function renderRecentJobs(jobs) {
        if (!elements.recentJobs) return;

        elements.recentJobs.replaceChildren();

        if (!jobs.length) {
            showRecentJobsMessage("No vacancies found.");

            if (elements.recentJobsEmpty) {
                elements.recentJobsEmpty.hidden = false;
            }

            return;
        }

        if (elements.recentJobsEmpty) {
            elements.recentJobsEmpty.hidden = true;
        }

        jobs.slice(0, 5).forEach(function (job) {
            const row = document.createElement("tr");

            const titleCell = document.createElement("td");
            titleCell.textContent = getJobTitle(job);

            const locationCell = document.createElement("td");
            locationCell.textContent = getJobLocation(job);

            const statusCell = document.createElement("td");
            const status = getJobStatus(job);

            const statusBadge = document.createElement("span");
            statusBadge.className = "job-status";

            // Only use known statuses as CSS class names.
            const allowedStatuses = [
                "draft",
                "published",
                "closed",
                "archived"
            ];

            if (allowedStatuses.includes(status)) {
                statusBadge.classList.add("status-" + status);
            }

            statusBadge.textContent = status;
            statusCell.appendChild(statusBadge);

            const actionsCell = document.createElement("td");
            const jobId = getJobId(job);

            if (jobId !== null && jobId !== undefined) {
                const editLink = document.createElement("a");

                editLink.href =
                    "job-form.html?id=" +
                    encodeURIComponent(String(jobId));

                editLink.textContent = "Edit";
                editLink.setAttribute(
                    "aria-label",
                    "Edit " + getJobTitle(job)
                );

                actionsCell.appendChild(editLink);
            } else {
                actionsCell.textContent = "—";
            }

            row.appendChild(titleCell);
            row.appendChild(locationCell);
            row.appendChild(statusCell);
            row.appendChild(actionsCell);

            elements.recentJobs.appendChild(row);
        });
    }

    // ------------------------------------------------------------
    // DASHBOARD STATISTICS
    // ------------------------------------------------------------

    async function loadStatistics() {
        const stats = await admin.api(
            "/api/admin/dashboard/stats",
            {
                method: "GET"
            }
        );

        if (!stats || typeof stats !== "object") {
            throw new Error(
                "The dashboard statistics response is invalid."
            );
        }

        setText(
            elements.totalJobs,
            formatNumber(stats.total_jobs)
        );

        setText(
            elements.publishedJobs,
            formatNumber(stats.published_jobs)
        );

        setText(
            elements.draftJobs,
            formatNumber(stats.draft_jobs)
        );

        setText(
            elements.totalApplications,
            formatNumber(stats.total_applications)
        );
    }

    // ------------------------------------------------------------
    // RECENT VACANCY DATA
    // ------------------------------------------------------------

    async function loadRecentJobs() {
        const response = await admin.api(
            "/api/admin/jobs?limit=100&offset=0",
            {
                method: "GET"
            }
        );

        const jobs = getJobsArray(response);

        renderRecentJobs(jobs);
    }

    // ------------------------------------------------------------
    // MAIN DASHBOARD LOADER
    // ------------------------------------------------------------

    async function loadDashboard() {
        if (loading) return;

        loading = true;
        clearMessage();

        if (elements.refresh) {
            elements.refresh.disabled = true;
            elements.refresh.textContent = "Loading...";
        }

        try {
            const authenticated = await admin.requireLogin();

            if (authenticated === false) {
                return;
            }

            let statsError = null;
            let jobsError = null;

            /*
             * Load statistics and recent jobs independently.
             * A failure in one section should not prevent
             * the other section from loading.
             */

            try {
                await loadStatistics();
            } catch (error) {
                statsError = error;

                console.error(
                    "AVERRA dashboard statistics error:",
                    error
                );
            }

            try {
                await loadRecentJobs();
            } catch (error) {
                jobsError = error;

                console.error(
                    "AVERRA recent vacancies error:",
                    error
                );

                showRecentJobsMessage(
                    "Unable to load recent vacancies. Please refresh."
                );
            }

            if (statsError && jobsError) {
                showMessage(
                    "Unable to load dashboard statistics or vacancies. Please refresh.",
                    "error"
                );
            } else if (statsError) {
                showMessage(
                    "Recent vacancies loaded, but statistics could not be loaded.",
                    "error"
                );
            } else if (jobsError) {
                showMessage(
                    "Statistics loaded, but recent vacancies could not be loaded.",
                    "error"
                );
            } else {
                showMessage(
                    "Dashboard updated successfully.",
                    "success"
                );
            }

        } catch (error) {
            console.error(
                "AVERRA dashboard loading error:",
                error
            );

            showMessage(
                error?.message ||
                "Unable to load dashboard. Please refresh.",
                "error"
            );

        } finally {
            loading = false;

            if (elements.refresh) {
                elements.refresh.disabled = false;
                elements.refresh.textContent = "Refresh";
            }
        }
    }

    // ------------------------------------------------------------
    // INITIALISATION
    // ------------------------------------------------------------

    if (elements.refresh) {
        elements.refresh.addEventListener(
            "click",
            loadDashboard
        );
    }

    loadDashboard();

})();
