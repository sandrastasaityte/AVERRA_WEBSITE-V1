
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/dashboard.js
   Version: 2.3.0

   Administrator dashboard.

   FEATURES
   - Administrator session verification
   - Vacancy statistics
   - Application statistics
   - Recent vacancies
   - Applications dashboard integration
   - API response validation
   - Loading, empty and error states
   - Retry and refresh controls
   - Safe text rendering
   - No duplicate logout handlers

   AUTHENTICATION
   Compatible with AVERRA_ADMIN authentication object.

   IMPORTANT
   Backend authentication must be configured.
   This file does not bypass backend authentication.
   ============================================================ */

(function () {
    "use strict";

    document.addEventListener(
        "DOMContentLoaded",
        initialise,
        { once: true }
    );

    async function initialise() {

        const elements = {
            message: document.getElementById("dashboard-message"),

            recentJobs: document.getElementById("recent-jobs"),

            totalJobs: document.getElementById("total-jobs"),
            publishedJobs: document.getElementById("published-jobs"),
            draftJobs: document.getElementById("draft-jobs"),

            totalApplications: document.getElementById("total-applications"),

            logoutButton: document.getElementById("logout-button"),
            refreshButton: document.getElementById("refresh-dashboard")
        };

        let isLoading = false;
        let retryButton = null;
        let destroyed = false;

        /* ========================================================
           MESSAGE HANDLING
           ======================================================== */

        function showMessage(text, type) {

            if (!elements.message) {
                console.log("AVERRA dashboard:", text);
                return;
            }

            elements.message.textContent = String(text || "");
            elements.message.className = "message";

            if (type) {
                elements.message.classList.add(type);
            }

            if (type === "error") {
                elements.message.setAttribute("role", "alert");
            } else {
                elements.message.setAttribute("role", "status");
            }
        }

        function setMetric(element, value) {

            if (element) {
                element.textContent = String(value);
            }
        }

        function setVacancyStatisticsUnavailable() {

            setMetric(elements.totalJobs, "—");
            setMetric(elements.publishedJobs, "—");
            setMetric(elements.draftJobs, "—");
        }

        function setApplicationStatisticsUnavailable() {

            setMetric(elements.totalApplications, "—");
        }

        /* ========================================================
           VACANCY TABLE
           ======================================================== */

        function showEmptyState(text) {

            if (!elements.recentJobs) {
                return;
            }

            elements.recentJobs.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.className = "empty-state";
            cell.textContent = text;

            row.appendChild(cell);
            elements.recentJobs.appendChild(row);
        }

        function addCell(row, value) {

            const cell = document.createElement("td");

            cell.textContent = String(value);

            row.appendChild(cell);
        }

        function normaliseJobs(response) {

            let jobs;

            if (Array.isArray(response)) {

                jobs = response;

            } else if (
                response &&
                typeof response === "object" &&
                Array.isArray(response.items)
            ) {

                jobs = response.items;

            } else if (
                response &&
                typeof response === "object" &&
                Array.isArray(response.jobs)
            ) {

                jobs = response.jobs;

            } else if (
                response &&
                typeof response === "object" &&
                Array.isArray(response.results)
            ) {

                jobs = response.results;

            } else {

                throw new Error(
                    "The jobs API returned an unexpected response format. " +
                    "Check /api/admin/jobs in the backend."
                );
            }

            return jobs.filter(function (job) {

                return (
                    job !== null &&
                    typeof job === "object" &&
                    !Array.isArray(job)
                );

            });
        }

        function getStatus(job) {

            const status = String(
                job.status || "draft"
            ).trim().toLowerCase();

            if (
                status === "published" ||
                status === "draft" ||
                status === "closed" ||
                status === "archived"
            ) {
                return status;
            }

            return "draft";
        }

        function getTimestamp(job) {

            const value = job.created_at || job.updated_at;

            if (!value) {
                return 0;
            }

            const timestamp = Date.parse(value);

            return Number.isFinite(timestamp)
                ? timestamp
                : 0;
        }

        function renderJobs(jobs) {

            if (!elements.recentJobs) {
                return;
            }

            elements.recentJobs.replaceChildren();

            if (jobs.length === 0) {

                showEmptyState(
                    "No vacancies found. Add your first job to get started."
                );

                return;
            }

            const sortedJobs = jobs
                .slice()
                .sort(function (a, b) {

                    return getTimestamp(b) - getTimestamp(a);

                })
                .slice(0, 5);

            sortedJobs.forEach(function (job) {

                const row = document.createElement("tr");

                addCell(
                    row,
                    job.title || "Untitled vacancy"
                );

                addCell(
                    row,
                    job.location || "Not specified"
                );

                const statusCell = document.createElement("td");
                const badge = document.createElement("span");

                const status = getStatus(job);

                badge.className = "status " + status;

                badge.textContent =
                    status.charAt(0).toUpperCase() +
                    status.slice(1);

                statusCell.appendChild(badge);
                row.appendChild(statusCell);

                const actionsCell = document.createElement("td");
                const editLink = document.createElement("a");

                editLink.href =
                    "job-form.html?id=" +
                    encodeURIComponent(String(job.id || ""));

                editLink.textContent = "Manage";
                editLink.className = "btn btn-secondary";

                actionsCell.appendChild(editLink);
                row.appendChild(actionsCell);

                elements.recentJobs.appendChild(row);

            });
        }

        /* ========================================================
           VACANCY STATISTICS
           ======================================================== */

        function updateVacancyStatistics(jobs) {

            const total = jobs.length;

            const published = jobs.filter(function (job) {

                return getStatus(job) === "published";

            }).length;

            const drafts = jobs.filter(function (job) {

                return getStatus(job) === "draft";

            }).length;

            setMetric(elements.totalJobs, total);
            setMetric(elements.publishedJobs, published);
            setMetric(elements.draftJobs, drafts);
        }

        /* ========================================================
           APPLICATION STATISTICS
           ======================================================== */

        function getApplicationCount(response) {

            /*
             * Supported response formats:
             *
             * 1. { total: 25, applications: [...] }
             * 2. { count: 25, items: [...] }
             * 3. { applications: [...] }
             * 4. { items: [...] }
             * 5. [...]
             */

            if (Array.isArray(response)) {
                return response.length;
            }

            if (
                !response ||
                typeof response !== "object"
            ) {
                throw new Error(
                    "The applications API returned an invalid response."
                );
            }

            if (
                Number.isInteger(response.total) &&
                response.total >= 0
            ) {
                return response.total;
            }

            if (
                Number.isInteger(response.count) &&
                response.count >= 0
            ) {
                return response.count;
            }

            if (Array.isArray(response.applications)) {
                return response.applications.length;
            }

            if (Array.isArray(response.items)) {
                return response.items.length;
            }

            if (Array.isArray(response.results)) {
                return response.results.length;
            }

            throw new Error(
                "The applications API did not return a total count."
            );
        }

        async function loadApplicationStatistics(admin) {

            if (!elements.totalApplications) {
                return;
            }

            try {

                const response = await admin.api(
                    "/api/admin/applications?limit=1&offset=0"
                );

                const total = getApplicationCount(response);

                setMetric(elements.totalApplications, total);

                console.info(
                    "AVERRA: Application statistics loaded:",
                    total
                );

                return total;

            } catch (error) {

                console.error(
                    "AVERRA application statistics error:",
                    error
                );

                setApplicationStatisticsUnavailable();

                return null;
            }
        }

        /* ========================================================
           LOADING STATE
           ======================================================== */

        function setLoadingState() {

            setVacancyStatisticsUnavailable();
            setApplicationStatisticsUnavailable();

            showMessage(
                "Loading dashboard…",
                ""
            );

            showEmptyState(
                "Loading vacancies…"
            );

            if (retryButton) {
                retryButton.hidden = true;
            }

            if (elements.refreshButton) {
                elements.refreshButton.disabled = true;
            }
        }

        /* ========================================================
           RETRY BUTTON
           ======================================================== */

        function ensureRetryButton() {

            if (retryButton) {
                return retryButton;
            }

            retryButton = document.createElement("button");

            retryButton.type = "button";
            retryButton.className = "btn btn-secondary";
            retryButton.textContent = "Try again";
            retryButton.style.marginTop = "8px";
            retryButton.hidden = true;

            retryButton.addEventListener(
                "click",
                function () {

                    loadDashboard();

                }
            );

            if (elements.message) {

                elements.message.insertAdjacentElement(
                    "afterend",
                    retryButton
                );

            } else {

                console.warn(
                    "AVERRA: #dashboard-message is missing."
                );

            }

            return retryButton;
        }

        /* ========================================================
           ERROR HANDLING
           ======================================================== */

        function showError(error) {

            console.error(
                "AVERRA dashboard error:",
                error
            );

            const message = (
                error &&
                typeof error.message === "string" &&
                error.message.trim()
            )
                ? error.message
                : "An unexpected error occurred.";

            showMessage(
                "Unable to load the dashboard: " + message,
                "error"
            );

            showEmptyState(
                "Vacancies could not be loaded. " +
                "Check the backend connection and try again."
            );

            setVacancyStatisticsUnavailable();

            const retry = ensureRetryButton();

            retry.hidden = false;
            retry.disabled = false;
            retry.textContent = "Try again";
        }

        /* ========================================================
           LOAD DASHBOARD
           ======================================================== */

        async function loadDashboard() {

            if (isLoading || destroyed) {
                return;
            }

            isLoading = true;

            setLoadingState();

            if (retryButton) {

                retryButton.disabled = true;
                retryButton.textContent = "Loading…";

            }

            try {

                /*
                 * Resolve the authentication object.
                 */

                const admin = window.AVERRA_ADMIN;

                if (
                    !admin ||
                    typeof admin.api !== "function"
                ) {

                    throw new Error(
                        "The authentication script is missing or failed " +
                        "to initialise. Check admin/js/auth.js."
                    );

                }

                /*
                 * Verify the administrator session.
                 */

                if (
                    typeof admin.requireLogin === "function"
                ) {

                    const permitted = await admin.requireLogin();

                    if (!permitted) {
                        return;
                    }

                } else {

                    const hasToken =
                        typeof admin.getToken === "function"
                            ? Boolean(admin.getToken())
                            : typeof admin.isAuthenticated === "function"
                                ? Boolean(admin.isAuthenticated())
                                : false;

                    if (!hasToken) {

                        if (typeof admin.logout === "function") {

                            admin.logout();

                        } else {

                            showMessage(
                                "Your administrator session is missing. " +
                                "Please sign in again.",
                                "error"
                            );

                        }

                        return;
                    }
                }

                /*
                 * LOAD VACANCIES
                 */

                const jobsResponse = await admin.api(
                    "/api/admin/jobs"
                );

                const jobs = normaliseJobs(jobsResponse);

                updateVacancyStatistics(jobs);
                renderJobs(jobs);

                /*
                 * LOAD APPLICATION STATISTICS
                 *
                 * An application endpoint failure does not
                 * prevent vacancy statistics from displaying.
                 */

                await loadApplicationStatistics(admin);

                /*
                 * DASHBOARD READY
                 */

                showMessage(
                    "Dashboard loaded successfully. " +
                    jobs.length +
                    " job record" +
                    (jobs.length === 1 ? "" : "s") +
                    " retrieved.",
                    "success"
                );

                if (retryButton) {
                    retryButton.hidden = true;
                }

            } catch (error) {

                showError(error);

            } finally {

                isLoading = false;

                if (elements.refreshButton) {
                    elements.refreshButton.disabled = false;
                }

                if (retryButton) {

                    retryButton.disabled = false;

                    if (!retryButton.hidden) {
                        retryButton.textContent = "Try again";
                    }

                }
            }
        }

        /* ========================================================
           EVENT HANDLERS
           ======================================================== */

        /*
         * auth.js manages the logout button.
         * Do not register a second logout handler here.
         */

        if (elements.refreshButton) {

            elements.refreshButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    loadDashboard();

                }
            );

        }

        /*
         * Start the dashboard.
         */

        await loadDashboard();

        /*
         * Public dashboard controls.
         */

        window.AVERRA_DASHBOARD = {

            version: "2.3.0",

            refresh: loadDashboard,

            destroy: function () {
                destroyed = true;
            }

        };

    }

})();
