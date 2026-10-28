
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/dashboard.js
   Version: 2.2.0

   Administrator dashboard.
   Compatible with admin/js/auth.js v3.x.

   FEATURES
   - Administrator session verification
   - Dashboard statistics
   - Recent vacancies
   - API response validation
   - Loading, empty and error states
   - Retry and refresh controls
   - Safe text rendering
   - No duplicate logout handlers

   IMPORTANT
   Backend authentication must be configured on Render.
   This file does not bypass or replace backend authentication.
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

        function setStatisticsUnavailable() {
            setMetric(elements.totalJobs, "—");
            setMetric(elements.publishedJobs, "—");
            setMetric(elements.draftJobs, "—");
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

            cell.colSpan = 3;
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
                    "Check the /api/admin/jobs endpoint in the backend."
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
                status === "closed"
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

                elements.recentJobs.appendChild(row);
            });
        }

        /* ========================================================
           DASHBOARD STATISTICS
           ======================================================== */

        function updateStatistics(jobs) {
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
           LOADING STATE
           ======================================================== */

        function setLoadingState() {
            setStatisticsUnavailable();

            showMessage("Loading dashboard…", "");

            showEmptyState("Loading vacancies…");

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
                    "AVERRA: #dashboard-message is missing. " +
                    "The retry button could not be positioned " +
                    "next to the dashboard message."
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

            setStatisticsUnavailable();

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
                 * Resolve the authentication object when needed.
                 * auth.js must be included by dashboard.html.
                 */
                const admin = window.AVERRA_ADMIN;

                if (
                    !admin ||
                    typeof admin.api !== "function"
                ) {
                    throw new Error(
                        "The authentication script is missing or " +
                        "failed to initialise. Check that admin/js/auth.js " +
                        "loads successfully before admin/js/dashboard.js."
                    );
                }

                /*
                 * Verify the administrator session before
                 * requesting protected dashboard data.
                 */
                if (
                    typeof admin.requireLogin === "function"
                ) {
                    const permitted = await admin.requireLogin();

                    if (!permitted) {
                        /*
                         * The authentication script may be
                         * redirecting to the login page.
                         */
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
                 * Fetch protected vacancy records.
                 * The backend must authenticate this request.
                 */
                const response = await admin.api(
                    "/api/admin/jobs"
                );

                const jobs = normaliseJobs(response);

                updateStatistics(jobs);
                renderJobs(jobs);

                showMessage(
                    "Dashboard loaded. " +
                    jobs.length +
                    " job record" +
                    (jobs.length === 1 ? "" : "s") +
                    " returned by the API.",
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
         * auth.js already binds #logout-button.
         * Do not register another logout handler here.
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
         * Start only after the DOM and dashboard controls
         * are available.
         */
        await loadDashboard();

        /*
         * Retain a reference for optional future page cleanup.
         */
        window.AVERRA_DASHBOARD = {
            version: "2.2.0",
            refresh: loadDashboard,
            destroy: function () {
                destroyed = true;
            }
        };
    }
})();
