
/**
 * AVERRA STAFFING SOLUTIONS LTD
 * Admin Dashboard
 * Version: 3.0.0
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

    if (!admin) {
        console.error("AVERRA_ADMIN is unavailable. Make sure auth.js loads first.");
        return;
    }

    const API_BASE_URL = admin.API_BASE_URL;

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

    function showMessage(message, type = "error") {
        if (!elements.message) return;

        elements.message.textContent = message;
        elements.message.className = `dashboard-message ${type}`;
        elements.message.hidden = false;
    }

    function clearMessage() {
        if (!elements.message) return;

        elements.message.textContent = "";
        elements.message.hidden = true;
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function formatNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "0";
        }

        return number.toLocaleString("en-GB");
    }

    function getJobsArray(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.jobs)) return response.jobs;
        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response?.results)) return response.results;

        return [];
    }

    function getJobTitle(job) {
        return job.title || job.job_title || "Untitled vacancy";
    }

    function getJobLocation(job) {
        return job.location || job.location_name || "Location not specified";
    }

    function getJobStatus(job) {
        return String(job.status || "unknown").toLowerCase();
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderRecentJobs(jobs) {
        if (!elements.recentJobs) return;

        elements.recentJobs.innerHTML = "";

        if (!jobs.length) {
            if (elements.recentJobsEmpty) {
                elements.recentJobsEmpty.hidden = false;
            }

            return;
        }

        if (elements.recentJobsEmpty) {
            elements.recentJobsEmpty.hidden = true;
        }

        jobs.slice(0, 5).forEach((job) => {
            const title = escapeHTML(getJobTitle(job));
            const location = escapeHTML(getJobLocation(job));
            const status = escapeHTML(getJobStatus(job));

            const item = document.createElement("div");
            item.className = "recent-job-item";

            item.innerHTML = `
                <div class="recent-job-info">
                    <strong>${title}</strong>
                    <span>${location}</span>
                </div>
                <span class="job-status status-${status}">
                    ${status}
                </span>
            `;

            elements.recentJobs.appendChild(item);
        });
    }

    async function loadDashboard() {
        if (loading) return;

        loading = true;
        clearMessage();

        if (elements.refresh) {
            elements.refresh.disabled = true;
            elements.refresh.textContent = "Loading...";
        }

        try {
            /*
             * Authentication is handled by auth.js.
             * The API method returns parsed JSON.
             */
            await admin.requireLogin();

            /*
             * Load accurate statistics from the database.
             */
            const stats = await admin.api(
                "/api/admin/dashboard/stats",
                {
                    method: "GET"
                }
            );

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

            /*
             * Load vacancies separately for the recent jobs section.
             */
            const jobsResponse = await admin.api(
                "/api/admin/jobs?limit=100",
                {
                    method: "GET"
                }
            );

            const jobs = getJobsArray(jobsResponse);

            renderRecentJobs(jobs);

        } catch (error) {
            console.error("Dashboard loading error:", error);

            showMessage(
                error?.message ||
                "Unable to load dashboard. Please refresh the page."
            );

        } finally {
            loading = false;

            if (elements.refresh) {
                elements.refresh.disabled = false;
                elements.refresh.textContent = "Refresh Dashboard";
            }
        }
    }

    if (elements.refresh) {
        elements.refresh.addEventListener("click", loadDashboard);
    }

    /*
     * Start dashboard after the scripts have loaded.
     */
    loadDashboard();

})();
