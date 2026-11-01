
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/jobs.js
   Version: 3.8.0

   FEATURES
   - Load and refresh vacancies
   - Request up to 200 vacancy records
   - Search by title and location
   - Filter by draft, published, closed and archived status
   - Edit vacancies
   - Publish and unpublish vacancies
   - Close and reopen vacancies
   - Restore archived vacancies to draft
   - Delete vacancies with confirmation
   - Require administrator authentication for changes
   - Prevent duplicate actions
   - Safely render vacancy information
   ============================================================ */

(function () {
    "use strict";

    const API_ENDPOINT = "/api/admin/jobs";
    const MAX_JOBS = 200;

    const VALID_STATUSES = new Set([
        "draft",
        "published",
        "closed",
        "archived"
    ]);

    const state = {
        jobs: [],
        loading: false,
        search: "",
        status: "all",
        activeActions: new Set()
    };

    let elements = {};

    document.addEventListener("DOMContentLoaded", initialise);

    // ------------------------------------------------------------
    // INITIALISATION
    // ------------------------------------------------------------

    function initialise() {
        elements = {
            message: document.getElementById("jobs-message"),
            table: document.getElementById("jobs-table"),
            search: document.getElementById("jobs-search"),
            status: document.getElementById("jobs-status-filter"),
            refresh: document.getElementById("refresh-jobs"),
            clear: document.getElementById("clear-job-filters"),
            count: document.getElementById("jobs-results-count"),
            empty: document.getElementById("jobs-empty-state"),
            logout: document.getElementById("logout-button")
        };

        const admin = window.AVERRA_ADMIN;

        if (
            !admin ||
            typeof admin.api !== "function" ||
            typeof admin.requireLogin !== "function"
        ) {
            showMessage(
                "Authentication could not be initialized. Check that js/auth.js loads successfully before js/jobs.js.",
                "error"
            );

            showTableMessage("Authentication script unavailable.");
            setCount("Vacancy records are unavailable.");
            return;
        }

        bindEvents(admin);
        loadJobs();
    }

    // ------------------------------------------------------------
    // EVENT BINDING
    // ------------------------------------------------------------

    function bindEvents(admin) {
        if (elements.search) {
            elements.search.addEventListener("input", function () {
                state.search = elements.search.value
                    .trim()
                    .toLowerCase();

                renderJobs();
            });
        }

        if (elements.status) {
            elements.status.addEventListener("change", function () {
                state.status = elements.status.value || "all";
                renderJobs();
            });
        }

        if (elements.refresh) {
            elements.refresh.addEventListener("click", function () {
                loadJobs();
            });
        }

        if (elements.clear) {
            elements.clear.addEventListener("click", clearFilters);
        }

        if (elements.logout) {
            elements.logout.addEventListener("click", function (event) {
                event.preventDefault();

                if (typeof admin.logout === "function") {
                    admin.logout();
                } else {
                    showMessage(
                        "The logout function is unavailable.",
                        "error"
                    );
                }
            });
        }
    }

    // ------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------

    async function ensureAuthenticated() {
        const admin = window.AVERRA_ADMIN;

        if (
            !admin ||
            typeof admin.requireLogin !== "function"
        ) {
            throw new Error(
                "Administrator authentication is unavailable."
            );
        }

        const permitted = await admin.requireLogin();

        if (permitted === false) {
            throw new Error(
                "Please sign in again to manage vacancies."
            );
        }

        return true;
    }

    // ------------------------------------------------------------
    // MESSAGE AND TABLE HELPERS
    // ------------------------------------------------------------

    function showMessage(message, type) {
        if (!elements.message) {
            return;
        }

        elements.message.textContent = String(message || "");
        elements.message.className = "message";

        if (type) {
            elements.message.classList.add(type);
        }

        elements.message.setAttribute(
            "role",
            type === "error" ? "alert" : "status"
        );

        elements.message.setAttribute("aria-live", "polite");
    }

    function setCount(message) {
        if (elements.count) {
            elements.count.textContent = String(message || "");
        }
    }

    function showTableMessage(message) {
        if (!elements.table) {
            return;
        }

        elements.table.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = String(message || "");

        row.appendChild(cell);
        elements.table.appendChild(row);
    }

    // ------------------------------------------------------------
    // API RESPONSE HELPERS
    // ------------------------------------------------------------

    function normaliseJobs(response) {
        let jobs;

        if (Array.isArray(response)) {
            jobs = response;
        } else if (response && Array.isArray(response.items)) {
            jobs = response.items;
        } else if (response && Array.isArray(response.jobs)) {
            jobs = response.jobs;
        } else if (response && Array.isArray(response.results)) {
            jobs = response.results;
        } else {
            throw new Error(
                "The jobs API returned an unexpected response format."
            );
        }

        return jobs.filter(function (job) {
            return job && typeof job === "object";
        });
    }

    function getJobId(job) {
        if (!job || typeof job !== "object") {
            return null;
        }

        return job.id ?? job.job_id ?? job.uuid ?? null;
    }

    function hasValidId(id) {
        return (
            id !== null &&
            id !== undefined &&
            /^[1-9]\d*$/.test(String(id).trim())
        );
    }

    function getStatus(job) {
        const status = String(
            job && job.status ? job.status : "draft"
        ).trim().toLowerCase();

        return VALID_STATUSES.has(status)
            ? status
            : "draft";
    }

    function getErrorMessage(error) {
        if (!error) {
            return "An unexpected error occurred. Please try again.";
        }

        if (error.status === 401) {
            return "Your administrator session is invalid. Please sign in again.";
        }

        if (error.status === 403) {
            return "You are not authorised to perform this action.";
        }

        if (error.status === 409) {
            return error.detail ||
                "This vacancy cannot be deleted because it has linked applications. Close or archive it instead.";
        }

        if (error.status === 503) {
            return error.detail ||
                "Administrator authentication is not configured on the backend.";
        }

        if (typeof error.detail === "string") {
            return error.detail;
        }

        if (Array.isArray(error.detail)) {
            return error.detail.map(function (item) {
                const message = item?.msg || "Invalid value";
                const location = Array.isArray(item?.loc)
                    ? item.loc.filter(function (part) {
                        return part !== "body";
                    }).join(".")
                    : "";

                return location
                    ? location + ": " + message
                    : message;
            }).join(" ");
        }

        if (typeof error.message === "string") {
            return error.message;
        }

        return "An unexpected error occurred. Please try again.";
    }

    // ------------------------------------------------------------
    // FILTERING
    // ------------------------------------------------------------

    function getFilteredJobs() {
        return state.jobs.filter(function (job) {
            const title = String(job.title || "").toLowerCase();
            const location = String(job.location || "").toLowerCase();

            const matchesSearch =
                !state.search ||
                title.includes(state.search) ||
                location.includes(state.search);

            const matchesStatus =
                state.status === "all" ||
                getStatus(job) === state.status;

            return matchesSearch && matchesStatus;
        });
    }

    // ------------------------------------------------------------
    // TABLE ELEMENT HELPERS
    // ------------------------------------------------------------

    function addCell(row, value) {
        const cell = document.createElement("td");

        const text = (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        )
            ? "Not specified"
            : String(value);

        cell.textContent = text;
        row.appendChild(cell);

        return cell;
    }

    function makeButton(label, className, onClick, disabled) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.disabled = Boolean(disabled);
        button.addEventListener("click", onClick);

        return button;
    }

    // ------------------------------------------------------------
    // ACTION BUTTONS
    // ------------------------------------------------------------

    function createStatusAction(job, id, status, actions) {
        let label = "";
        let nextStatus = "";

        if (status === "published") {
            label = "Unpublish";
            nextStatus = "draft";
        } else if (status === "draft") {
            label = "Publish";
            nextStatus = "published";
        } else if (status === "closed") {
            label = "Reopen";
            nextStatus = "draft";
        } else if (status === "archived") {
            label = "Restore";
            nextStatus = "draft";
        }

        if (!label) {
            return;
        }

        const button = makeButton(
            label,
            "job-action job-action-edit",
            function () {
                if (
                    status === "archived" &&
                    !window.confirm(
                        "Restore this archived vacancy to Draft? It will remain unpublished until you publish it."
                    )
                ) {
                    return;
                }

                if (
                    status === "closed" &&
                    !window.confirm(
                        "Reopen this vacancy by changing its status to Draft? You can publish it afterwards."
                    )
                ) {
                    return;
                }

                changeStatus(id, nextStatus, button);
            },
            !hasValidId(id)
        );

        actions.appendChild(button);
    }

    // ------------------------------------------------------------
    // RENDER VACANCIES
    // ------------------------------------------------------------

    function renderJobs() {
        if (!elements.table) {
            return;
        }

        const jobs = getFilteredJobs();

        elements.table.replaceChildren();

        if (elements.empty) {
            elements.empty.hidden = jobs.length !== 0;
        }

        setCount(
            "Showing " + jobs.length +
            " of " + state.jobs.length +
            " vacancy record" +
            (state.jobs.length === 1 ? "" : "s") + "."
        );

        if (jobs.length === 0) {
            showTableMessage(
                state.jobs.length === 0
                    ? "No vacancies have been created yet."
                    : "No vacancies match your search or filters."
            );

            return;
        }

        jobs.forEach(function (job) {
            const row = document.createElement("tr");
            const id = getJobId(job);
            const hasId = hasValidId(id);
            const status = getStatus(job);

            addCell(row, job.title || "Untitled vacancy");
            addCell(row, job.location || "Not specified");

            addCell(
                row,
                job.employment_type ||
                job.employmentType ||
                job.employment ||
                "Not specified"
            );

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = "status " + status;
            badge.textContent =
                status.charAt(0).toUpperCase() + status.slice(1);

            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");

            actions.className = "job-actions";

            const editButton = makeButton(
                "Edit",
                "job-action job-action-edit",
                function () {
                    if (!hasId) {
                        showMessage(
                            "This vacancy has no record ID and cannot be edited.",
                            "error"
                        );
                        return;
                    }

                    window.location.href =
                        "job-form.html?id=" +
                        encodeURIComponent(String(id));
                },
                !hasId
            );

            actions.appendChild(editButton);

            createStatusAction(job, id, status, actions);

            const closeButton = makeButton(
                "Close",
                "job-action job-action-edit",
                function () {
                    if (!hasId) {
                        showMessage(
                            "This vacancy has no record ID.",
                            "error"
                        );
                        return;
                    }

                    if (!window.confirm(
                        "Close this vacancy? It will no longer be marked as an open position."
                    )) {
                        return;
                    }

                    changeStatus(id, "closed", closeButton);
                },
                !hasId || status === "closed" || status === "archived"
            );

            if (status === "draft" || status === "published") {
                actions.appendChild(closeButton);
            }

            const archiveButton = makeButton(
                "Archive",
                "job-action job-action-edit",
                function () {
                    if (!window.confirm(
                        "Archive this vacancy? It will no longer be advertised as an open position."
                    )) {
                        return;
                    }

                    changeStatus(id, "archived", archiveButton);
                },
                !hasId || status === "archived"
            );

            if (status === "closed") {
                actions.appendChild(archiveButton);
            }

            const deleteButton = makeButton(
                "Delete",
                "job-action job-action-delete",
                function () {
                    deleteJobRecord(id, deleteButton);
                },
                !hasId
            );

            actions.appendChild(deleteButton);

            actionsCell.appendChild(actions);
            row.appendChild(actionsCell);

            elements.table.appendChild(row);
        });
    }

    // ------------------------------------------------------------
    // LOAD VACANCIES
    // ------------------------------------------------------------

    async function loadJobs() {
        if (state.loading) {
            return;
        }

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage(
                "The authentication helper is unavailable.",
                "error"
            );
            return;
        }

        state.loading = true;
        setRefreshState(true);

        showMessage("Loading vacancies...");
        setCount("Loading vacancy records...");
        showTableMessage("Loading vacancies...");

        try {
            const permitted = await admin.requireLogin();

            if (permitted === false) {
                showMessage(
                    "Please sign in to view vacancy records.",
                    "error"
                );

                showTableMessage("Sign-in is required.");
                setCount("Sign-in required.");
                return;
            }

            const response = await admin.api(
                API_ENDPOINT + "?limit=" + MAX_JOBS + "&offset=0",
                {
                    method: "GET"
                }
            );

            state.jobs = normaliseJobs(response);

            renderJobs();

            showMessage(
                "Vacancies loaded successfully.",
                "success"
            );

            if (state.jobs.length === MAX_JOBS) {
                showMessage(
                    "The first " + MAX_JOBS +
                    " vacancies are loaded. Older records may require pagination.",
                    "info"
                );
            }

        } catch (error) {
            console.error(
                "AVERRA jobs loading error:",
                error
            );

            showMessage(
                "Unable to load vacancies: " +
                getErrorMessage(error),
                "error"
            );

            showTableMessage("Vacancies could not be loaded.");
            setCount("Unable to load vacancy records.");

        } finally {
            state.loading = false;
            setRefreshState(false);
        }
    }

    function setRefreshState(isLoading) {
        if (!elements.refresh) {
            return;
        }

        elements.refresh.disabled = isLoading;
        elements.refresh.textContent = isLoading
            ? "Loading..."
            : "Refresh list";
    }

    // ------------------------------------------------------------
    // UPDATE VACANCY STATUS
    // ------------------------------------------------------------

    async function changeStatus(id, newStatus, button) {
        if (!hasValidId(id)) {
            showMessage(
                "A valid vacancy ID is required.",
                "error"
            );
            return;
        }

        if (!VALID_STATUSES.has(newStatus)) {
            showMessage(
                "The requested vacancy status is invalid.",
                "error"
            );
            return;
        }

        const key = String(id);

        if (state.activeActions.has(key)) {
            return;
        }

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage(
                "The authentication helper is unavailable.",
                "error"
            );
            return;
        }

        state.activeActions.add(key);

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            await ensureAuthenticated();

            await admin.api(
                API_ENDPOINT + "/" + encodeURIComponent(key),
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

            showMessage(
                "Vacancy status updated successfully.",
                "success"
            );

            await loadJobs();

        } catch (error) {
            console.error(
                "AVERRA status update error:",
                error
            );

            showMessage(
                "Unable to update vacancy: " +
                getErrorMessage(error),
                "error"
            );

        } finally {
            state.activeActions.delete(key);
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // ------------------------------------------------------------
    // DELETE VACANCY
    // ------------------------------------------------------------

    async function deleteJobRecord(id, button) {
        if (!hasValidId(id)) {
            showMessage(
                "A valid vacancy ID is required.",
                "error"
            );
            return;
        }

        const key = String(id);

        if (state.activeActions.has(key)) {
            return;
        }

        if (!window.confirm(
            "Are you sure you want to delete this vacancy?\n\n" +
            "This action may be permanent. If applications are linked to this vacancy, the server may prevent deletion."
        )) {
            return;
        }

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage(
                "The authentication helper is unavailable.",
                "error"
            );
            return;
        }

        state.activeActions.add(key);

        const originalText = button
            ? button.textContent
            : "Delete";

        if (button) {
            button.disabled = true;
            button.textContent = "Deleting...";
        }

        try {
            await ensureAuthenticated();

            showMessage("Deleting vacancy...", "info");

            await admin.api(
                API_ENDPOINT + "/" + encodeURIComponent(key),
                {
                    method: "DELETE"
                }
            );

            state.jobs = state.jobs.filter(function (job) {
                return String(getJobId(job)) !== key;
            });

            renderJobs();

            showMessage(
                "Vacancy deleted successfully.",
                "success"
            );

        } catch (error) {
            console.error(
                "AVERRA vacancy deletion error:",
                error
            );

            showMessage(
                "Unable to delete vacancy: " +
                getErrorMessage(error) +
                " If this vacancy has linked applications, close or archive it instead.",
                "error"
            );

        } finally {
            state.activeActions.delete(key);

            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    // ------------------------------------------------------------
    // FILTER CONTROLS
    // ------------------------------------------------------------

    function clearFilters() {
        state.search = "";
        state.status = "all";

        if (elements.search) {
            elements.search.value = "";
        }

        if (elements.status) {
            elements.status.value = "all";
        }

        renderJobs();
    }

})();
