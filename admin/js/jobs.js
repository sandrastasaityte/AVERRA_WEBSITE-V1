
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/jobs.js
   Version: 3.7.0

   FEATURES
   - Load and refresh vacancies
   - Request up to 200 vacancy records
   - Search by title and location
   - Filter by draft, published and closed status
   - Edit vacancies
   - Publish and unpublish vacancies
   - Close vacancies
   - Delete vacancies with confirmation
   - Prevent duplicate actions
   - Display API and authentication errors
   - Safely render vacancy information
   ============================================================ */

(function () {
    const API_ENDPOINT = "/api/admin/jobs";
    const MAX_JOBS = 200;

    const state = {
        jobs: [],
        loading: false,
        search: "",
        status: "all",
        activeActions: new Set()
    };

    let elements = {};

    document.addEventListener("DOMContentLoaded", initialise);

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

        if (!admin || typeof admin.api !== "function") {
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

    function showMessage(message, type) {
        if (!elements.message) return;

        elements.message.textContent = String(message || "");
        elements.message.className = "message";

        if (type) {
            elements.message.classList.add(type);
        }

        elements.message.setAttribute("role", "status");
        elements.message.setAttribute("aria-live", "polite");
    }

    function setCount(message) {
        if (elements.count) {
            elements.count.textContent = String(message || "");
        }
    }

    function showTableMessage(message) {
        if (!elements.table) return;

        elements.table.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = String(message || "");

        row.appendChild(cell);
        elements.table.appendChild(row);
    }

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
            String(id).trim() !== ""
        );
    }

    function getStatus(job) {
        const status = String(
            job && job.status ? job.status : "draft"
        ).trim().toLowerCase();

        return ["draft", "published", "closed"].includes(status)
            ? status
            : "draft";
    }

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

    function renderJobs() {
        if (!elements.table) return;

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

            if (status !== "closed") {
                const nextStatus =
                    status === "published" ? "draft" : "published";

                const statusButton = makeButton(
                    status === "published" ? "Unpublish" : "Publish",
                    "job-action job-action-edit",
                    function () {
                        changeStatus(id, nextStatus, statusButton);
                    },
                    !hasId
                );

                actions.appendChild(statusButton);

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
                            "Close this vacancy? It will no longer be marked as open."
                        )) {
                            return;
                        }

                        changeStatus(id, "closed", closeButton);
                    },
                    !hasId
                );

                actions.appendChild(closeButton);
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

    async function loadJobs() {
        if (state.loading) return;

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

        showMessage("Loading vacancies…");
        setCount("Loading vacancy records…");
        showTableMessage("Loading vacancies…");

        try {
            if (typeof admin.requireLogin === "function") {
                const permitted = await admin.requireLogin();

                if (!permitted) {
                    showMessage(
                        "Please sign in to view vacancy records.",
                        "error"
                    );
                    showTableMessage("Sign-in is required.");
                    setCount("Sign-in required.");
                    return;
                }
            }

            const response = await admin.api(
                API_ENDPOINT + "?limit=" + MAX_JOBS + "&offset=0"
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
                    "success"
                );
            }
        } catch (error) {
            console.error("AVERRA jobs loading error:", error);

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
        if (!elements.refresh) return;

        elements.refresh.disabled = isLoading;
        elements.refresh.textContent = isLoading
            ? "Loading…"
            : "Refresh list";
    }

    function getErrorMessage(error) {
        if (error && typeof error.message === "string") {
            return error.message;
        }

        return "An unexpected error occurred. Please try again.";
    }

    async function changeStatus(id, newStatus, button) {
        if (!hasValidId(id)) {
            showMessage("A valid vacancy ID is required.", "error");
            return;
        }

        if (!["draft", "published", "closed"].includes(newStatus)) {
            showMessage("The requested vacancy status is invalid.", "error");
            return;
        }

        const key = String(id);

        if (state.activeActions.has(key)) return;

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
        button.textContent = "Saving…";

        try {
            await admin.api(
                API_ENDPOINT + "/" + encodeURIComponent(key),
                {
                    method: "PATCH",
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
            console.error("AVERRA status update error:", error);

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

    async function deleteJobRecord(id, button) {
        if (!hasValidId(id)) {
            showMessage("A valid vacancy ID is required.", "error");
            return;
        }

        const key = String(id);

        if (state.activeActions.has(key)) return;

        if (!window.confirm(
            "Are you sure you want to delete this vacancy? This action may be permanent."
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

        const originalText = button ? button.textContent : "Delete";

        if (button) {
            button.disabled = true;
            button.textContent = "Deleting…";
        }

        try {
            showMessage("Deleting vacancy…");

            if (typeof admin.deleteJob === "function") {
                await admin.deleteJob(key);
            } else {
                await admin.api(
                    API_ENDPOINT + "/" + encodeURIComponent(key),
                    {
                        method: "DELETE"
                    }
                );
            }

            state.jobs = state.jobs.filter(function (job) {
                return String(getJobId(job)) !== key;
            });

            renderJobs();

            showMessage(
                "Vacancy deleted successfully.",
                "success"
            );
        } catch (error) {
            console.error("AVERRA vacancy deletion error:", error);

            showMessage(
                "Unable to delete vacancy: " +
                getErrorMessage(error) +
                " If this vacancy has linked applications, close it instead.",
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
