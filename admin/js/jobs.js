
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/jobs.js
   Version: 3.6.0

   Features:
   - Load and refresh vacancies
   - Search by job title and location
   - Filter by draft, published and closed status
   - Edit vacancies
   - Publish, unpublish and close vacancies
   - Delete vacancies with confirmation
   - Display API errors
   ============================================================ */

(function () {
    const state = {
        jobs: [],
        loading: false,
        search: "",
        status: "all"
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
            return;
        }

        if (elements.search) {
            elements.search.addEventListener("input", function () {
                state.search = elements.search.value.trim().toLowerCase();
                renderJobs();
            });
        }

        if (elements.status) {
            elements.status.addEventListener("change", function () {
                state.status = elements.status.value;
                renderJobs();
            });
        }

        if (elements.refresh) {
            elements.refresh.addEventListener("click", loadJobs);
        }

        if (elements.clear) {
            elements.clear.addEventListener("click", clearFilters);
        }

        if (elements.logout) {
            elements.logout.addEventListener("click", function (event) {
                event.preventDefault();

                if (typeof admin.logout === "function") {
                    admin.logout();
                }
            });
        }

        loadJobs();
    }

    function showMessage(message, type) {
        if (!elements.message) return;

        elements.message.textContent = message;
        elements.message.className = "message";

        if (type) {
            elements.message.classList.add(type);
        }
    }

    function setCount(message) {
        if (elements.count) {
            elements.count.textContent = message;
        }
    }

    function showTableMessage(message) {
        if (!elements.table) return;

        elements.table.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = message;

        row.appendChild(cell);
        elements.table.appendChild(row);
    }

    function normaliseJobs(response) {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.items)) return response.items;
        if (response && Array.isArray(response.jobs)) return response.jobs;
        if (response && Array.isArray(response.results)) return response.results;

        throw new Error("The jobs API returned an unexpected response format.");
    }

    function getJobId(job) {
        return job.id ?? job.job_id ?? job.uuid ?? null;
    }

    function getStatus(job) {
        const status = String(job.status || "draft").trim().toLowerCase();

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
        cell.textContent = String(value || "Not specified");
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
            "Showing " + jobs.length + " of " + state.jobs.length +
            " vacancy record" + (state.jobs.length === 1 ? "" : "s") + "."
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
            const hasId = id !== null && id !== undefined && id !== "";

            addCell(row, job.title || "Untitled vacancy");
            addCell(row, job.location || "Not specified");
            addCell(
                row,
                job.employment_type ||
                job.employmentType ||
                job.employment ||
                "Not specified"
            );

            const status = getStatus(job);
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

            actions.appendChild(
                makeButton(
                    "Edit",
                    "job-action job-action-edit",
                    function () {
                        if (!hasId) {
                            showMessage("This vacancy has no record ID.", "error");
                            return;
                        }

                        window.location.href =
                            "job-form.html?id=" + encodeURIComponent(id);
                    },
                    !hasId
                )
            );

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

            actions.appendChild(
                makeButton(
                    "Delete",
                    "job-action job-action-delete",
                    function () {
                        deleteJobRecord(id);
                    },
                    !hasId
                )
            );

            actionsCell.appendChild(actions);
            row.appendChild(actionsCell);
            elements.table.appendChild(row);
        });
    }

    async function loadJobs() {
        if (state.loading) return;

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage("The authentication helper is unavailable.", "error");
            return;
        }

        state.loading = true;

        if (elements.refresh) {
            elements.refresh.disabled = true;
            elements.refresh.textContent = "Loading…";
        }

        showMessage("Loading vacancies…");
        setCount("Loading vacancy records…");
        showTableMessage("Loading vacancies…");

        try {
            if (typeof admin.requireLogin === "function") {
                const permitted = await admin.requireLogin();

                if (!permitted) return;
            }

            const response = await admin.api("/api/admin/jobs");

            state.jobs = normaliseJobs(response);

            renderJobs();
            showMessage("Vacancies loaded successfully.", "success");
        } catch (error) {
            console.error("AVERRA jobs loading error:", error);

            showMessage(
                "Unable to load vacancies: " +
                (error.message || "An unexpected error occurred."),
                "error"
            );

            showTableMessage("Vacancies could not be loaded.");
            setCount("Unable to load vacancy records.");
        } finally {
            state.loading = false;

            if (elements.refresh) {
                elements.refresh.disabled = false;
                elements.refresh.textContent = "Refresh list";
            }
        }
    }

    async function changeStatus(id, newStatus, button) {
        if (id === null || id === undefined || id === "") {
            showMessage("A vacancy ID is required.", "error");
            return;
        }

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage("The authentication helper is unavailable.", "error");
            return;
        }

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "Saving…";

        try {
            await admin.api(
                "/api/admin/jobs/" + encodeURIComponent(id),
                {
                    method: "PATCH",
                    body: JSON.stringify({ status: newStatus })
                }
            );

            showMessage("Vacancy status updated.", "success");
            await loadJobs();
        } catch (error) {
            console.error("AVERRA status update error:", error);

            showMessage(
                "Unable to update vacancy: " +
                (error.message || "An unexpected error occurred."),
                "error"
            );
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async function deleteJobRecord(id) {
        if (id === null || id === undefined || id === "") {
            showMessage("A vacancy ID is required.", "error");
            return;
        }

        if (!window.confirm(
            "Are you sure you want to delete this vacancy? This action may be permanent."
        )) {
            return;
        }

        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
            showMessage("The authentication helper is unavailable.", "error");
            return;
        }

        try {
            showMessage("Deleting vacancy…");

            if (typeof admin.deleteJob === "function") {
                await admin.deleteJob(id);
            } else {
                await admin.api(
                    "/api/admin/jobs/" + encodeURIComponent(id),
                    { method: "DELETE" }
                );
            }

            state.jobs = state.jobs.filter(function (job) {
                return String(getJobId(job)) !== String(id);
            });

            renderJobs();
            showMessage("Vacancy deleted successfully.", "success");
        } catch (error) {
            console.error("AVERRA vacancy deletion error:", error);

            showMessage(
                "Unable to delete vacancy: " +
                (error.message || "An unexpected error occurred.") +
                " If it has linked applications, close it instead.",
                "error"
            );
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
