/**
 * AVERRA STAFFING SOLUTIONS LTD
 * File: admin/js/candidate-registrations.js
 * Version: 1.0.0
 *
 * Administrator candidate registration management.
 *
 * Features:
 * - Retrieves candidate registrations from the backend.
 * - Search and status filtering.
 * - Pagination.
 * - Individual candidate details.
 * - Candidate status updates.
 * - Keeps registrations separate from job applications.
 * - Does not delete candidate records.
 */

(function () {
    "use strict";

    if (window.AVERRA_CANDIDATE_REGISTRATIONS_INITIALISED) {
        console.warn("Candidate registrations page already initialised.");
        return;
    }

    window.AVERRA_CANDIDATE_REGISTRATIONS_INITIALISED = true;

    const PAGE_SIZE = 20;
    const API_ENDPOINT = "/api/admin/candidate-registrations";

    const STATUSES = [
        "new",
        "reviewing",
        "contacted",
        "shortlisted",
        "rejected",
        "withdrawn"
    ];

    const state = {
        page: 1,
        search: "",
        status: "",
        registrations: [],
        selectedRegistration: null,
        loading: false
    };

    const elements = {};

    // --------------------------------------------------------
    // INITIALISATION
    // --------------------------------------------------------

    document.addEventListener("DOMContentLoaded", initialise);

    async function initialise() {
        elements.message = document.getElementById("registration-message");
        elements.tableBody = document.getElementById("registration-table-body");
        elements.pageInfo = document.getElementById("registration-page-info");

        elements.searchForm = document.getElementById(
            "registration-search-form"
        );

        elements.searchInput = document.getElementById(
            "registration-search"
        );

        elements.statusFilter = document.getElementById(
            "registration-status-filter"
        );

        elements.refreshButton = document.getElementById(
            "refresh-registrations"
        );

        elements.previousButton = document.getElementById(
            "registration-previous"
        );

        elements.nextButton = document.getElementById(
            "registration-next"
        );

        elements.detailPanel = document.getElementById(
            "registration-detail"
        );

        elements.detailTitle = document.getElementById(
            "registration-detail-title"
        );

        elements.detailReference = document.getElementById(
            "registration-detail-reference"
        );

        elements.detailContent = document.getElementById(
            "registration-detail-content"
        );

        elements.detailStatus = document.getElementById(
            "registration-detail-status-select"
        );

        elements.saveDetailStatus = document.getElementById(
            "save-registration-detail-status"
        );

        elements.closeDetail = document.getElementById(
            "close-registration-detail"
        );

        elements.logout = document.getElementById(
            "registration-logout"
        );

        if (!window.AVERRA_ADMIN || typeof window.AVERRA_ADMIN.api !== "function") {
            showMessage(
                "Administrator authentication could not be loaded. Please reload the page.",
                "error"
            );
            return;
        }

        bindEvents();

        const authenticated = await window.AVERRA_ADMIN.requireLogin();

        if (!authenticated) {
            return;
        }

        await loadRegistrations();
    }

    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    function bindEvents() {
        elements.searchForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            state.search = elements.searchInput.value.trim();
            state.status = elements.statusFilter.value;
            state.page = 1;

            await loadRegistrations();
        });

        elements.statusFilter.addEventListener("change", async function () {
            state.search = elements.searchInput.value.trim();
            state.status = elements.statusFilter.value;
            state.page = 1;

            await loadRegistrations();
        });

        elements.refreshButton.addEventListener("click", async function () {
            await loadRegistrations();
        });

        elements.previousButton.addEventListener("click", async function () {
            if (state.page <= 1 || state.loading) {
                return;
            }

            state.page -= 1;
            await loadRegistrations();
        });

        elements.nextButton.addEventListener("click", async function () {
            if (state.loading) {
                return;
            }

            state.page += 1;
            await loadRegistrations();
        });

        elements.closeDetail.addEventListener("click", closeDetails);

        elements.saveDetailStatus.addEventListener(
            "click",
            saveDetailStatus
        );

        elements.tableBody.addEventListener("click", handleTableAction);

        elements.logout.addEventListener("click", function () {
            window.AVERRA_ADMIN.logout();
        });
    }

    // --------------------------------------------------------
    // API
    // --------------------------------------------------------

    async function apiRequest(path, options) {
        return window.AVERRA_ADMIN.api(path, options || {});
    }

    async function loadRegistrations() {
        if (state.loading) {
            return;
        }

        state.loading = true;

        setLoading(true);
        clearMessage();

        const offset = (state.page - 1) * PAGE_SIZE;

        const params = new URLSearchParams();

        // Request one extra record to determine whether another
        // page exists, without requiring a backend count endpoint.
        params.set("limit", String(PAGE_SIZE + 1));
        params.set("offset", String(offset));

        if (state.status) {
            params.set("status", state.status);
        }

        if (state.search) {
            params.set("search", state.search);
        }

        try {
            const records = await apiRequest(
                API_ENDPOINT + "?" + params.toString()
            );

            if (!Array.isArray(records)) {
                throw new Error(
                    "The server returned an unexpected registrations response."
                );
            }

            const hasNextPage = records.length > PAGE_SIZE;

            state.registrations = records.slice(0, PAGE_SIZE);

            renderRegistrations(hasNextPage);

            if (state.registrations.length === 0 && state.page > 1) {
                state.page -= 1;
                await loadRegistrations();
                return;
            }

            if (state.registrations.length === 0) {
                showMessage(
                    "No candidate registrations were found for these filters.",
                    "info"
                );
            }

        } catch (error) {
            console.error(
                "Could not load candidate registrations:",
                error
            );

            renderTableMessage(
                error.message || "Unable to load candidate registrations."
            );

            elements.pageInfo.textContent = "Unable to load records.";

            showMessage(
                error.message || "Unable to load candidate registrations.",
                "error"
            );

        } finally {
            state.loading = false;
            setLoading(false);
        }
    }

    async function updateRegistrationStatus(registrationId, newStatus) {
        if (!STATUSES.includes(newStatus)) {
            showMessage("Please select a valid registration status.", "error");
            return null;
        }

        try {
            const updated = await apiRequest(
                API_ENDPOINT + "/" + encodeURIComponent(registrationId),
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );

            showMessage(
                "Candidate registration #" + registrationId +
                " has been updated to " + newStatus + ".",
                "success"
            );

            return updated;

        } catch (error) {
            console.error(
                "Could not update candidate registration:",
                error
            );

            showMessage(
                error.message || "Unable to update the registration status.",
                "error"
            );

            return null;
        }
    }

    // --------------------------------------------------------
    // TABLE RENDERING
    // --------------------------------------------------------

    function renderRegistrations(hasNextPage) {
        elements.tableBody.replaceChildren();

        if (state.registrations.length === 0) {
            renderTableMessage("No registrations to display.");
        } else {
            state.registrations.forEach(function (registration) {
                elements.tableBody.appendChild(
                    createRegistrationRow(registration)
                );
            });
        }

        const firstRecord = state.registrations.length
            ? (state.page - 1) * PAGE_SIZE + 1
            : 0;

        const lastRecord = (state.page - 1) * PAGE_SIZE +
            state.registrations.length;

        elements.pageInfo.textContent =
            "Page " + state.page +
            " · Showing " + firstRecord +
            "–" + lastRecord +
            (hasNextPage ? " · More records available" : " · End of results");

        elements.previousButton.disabled = state.page <= 1;
        elements.nextButton.disabled = !hasNextPage;
    }

    function createRegistrationRow(registration) {
        const row = document.createElement("tr");

        const candidateCell = document.createElement("td");

        const name = document.createElement("span");
        name.className = "registration-name";
        name.textContent = registration.full_name ||
            [registration.first_name, registration.last_name]
                .filter(Boolean)
                .join(" ");

        const email = document.createElement("span");
        email.className = "registration-subtext";
        email.textContent = registration.email || "No email provided";

        candidateCell.append(name, email);

        const careerCell = createCell(
            registration.career_area || "Not provided"
        );

        const experienceCell = createCell(
            registration.professional_experience || "Not provided"
        );

        const countryCell = createCell(
            registration.country_of_residence || "Not provided"
        );

        const dateCell = createCell(formatDate(registration.created_at));

        const statusCell = document.createElement("td");
        const statusLabel = document.createElement("span");

        const currentStatus = STATUSES.includes(registration.status)
            ? registration.status
            : "new";

        statusLabel.className =
            "registration-status-label " + currentStatus;

        statusLabel.textContent = currentStatus;
        statusCell.appendChild(statusLabel);

        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");

        actions.className = "registration-actions";

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "registration-button secondary";
        viewButton.textContent = "View";
        viewButton.dataset.action = "view";
        viewButton.dataset.id = String(registration.id);

        const statusSelect = document.createElement("select");
        statusSelect.className = "registration-status-select";
        statusSelect.setAttribute(
            "aria-label",
            "New status for " + (registration.full_name || "candidate")
        );
        statusSelect.dataset.action = "status";
        statusSelect.dataset.id = String(registration.id);

        STATUSES.forEach(function (statusValue) {
            const option = document.createElement("option");
            option.value = statusValue;
            option.textContent = capitalise(statusValue);
            statusSelect.appendChild(option);
        });

        statusSelect.value = currentStatus;

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "registration-button";
        saveButton.textContent = "Save";
        saveButton.dataset.action = "save-status";
        saveButton.dataset.id = String(registration.id);

        actions.append(viewButton, statusSelect, saveButton);
        actionsCell.appendChild(actions);

        row.append(
            candidateCell,
            careerCell,
            experienceCell,
            countryCell,
            dateCell,
            statusCell,
            actionsCell
        );

        return row;
    }

    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        return cell;
    }

    function renderTableMessage(message) {
        elements.tableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "registration-empty";
        cell.textContent = message;

        row.appendChild(cell);
        elements.tableBody.appendChild(row);
    }

    // --------------------------------------------------------
    // TABLE ACTIONS
    // --------------------------------------------------------

    async function handleTableAction(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const registrationId = button.dataset.id;

        if (!registrationId) {
            return;
        }

        if (action === "view") {
            await openDetails(registrationId);
            return;
        }

        if (action === "save-status") {
            const row = button.closest("tr");

            if (!row) {
                return;
            }

            const select = row.querySelector(
                'select[data-action="status"]'
            );

            if (!select) {
                return;
            }

            button.disabled = true;
            button.textContent = "Saving...";

            const updated = await updateRegistrationStatus(
                registrationId,
                select.value
            );

            button.disabled = false;
            button.textContent = "Save";

            if (updated) {
                await loadRegistrations();

                if (
                    state.selectedRegistration &&
                    String(state.selectedRegistration.id) ===
                    String(registrationId)
                ) {
                    await openDetails(registrationId);
                }
            }
        }
    }

    // --------------------------------------------------------
    // CANDIDATE DETAILS
    // --------------------------------------------------------

    async function openDetails(registrationId) {
        elements.detailPanel.classList.add("visible");

        elements.detailTitle.textContent = "Loading candidate...";
        elements.detailReference.textContent =
            "Registration reference #" + registrationId;

        elements.detailContent.replaceChildren();

        addDetailItem(
            "Loading",
            "Retrieving candidate information..."
        );

        elements.saveDetailStatus.disabled = true;

        try {
            const registration = await apiRequest(
                API_ENDPOINT + "/" + encodeURIComponent(registrationId)
            );

            state.selectedRegistration = registration;

            renderDetails(registration);

            elements.detailPanel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            console.error(
                "Could not retrieve candidate details:",
                error
            );

            elements.detailTitle.textContent = "Unable to load candidate";
            elements.detailContent.replaceChildren();

            addDetailItem(
                "Error",
                error.message || "Unable to retrieve candidate details."
            );

            showMessage(
                error.message || "Unable to retrieve candidate details.",
                "error"
            );

        } finally {
            elements.saveDetailStatus.disabled = false;
        }
    }

    function renderDetails(registration) {
        elements.detailContent.replaceChildren();

        elements.detailTitle.textContent =
            registration.full_name ||
            [
                registration.first_name,
                registration.last_name
            ].filter(Boolean).join(" ") ||
            "Candidate details";

        elements.detailReference.textContent =
            "Registration reference #" + registration.id +
            " · Submitted " + formatDate(registration.created_at);

        addDetailItem("First name", registration.first_name);
        addDetailItem("Last name", registration.last_name);
        addDetailItem("Email address", registration.email);
        addDetailItem("Nationality", registration.nationality);
        addDetailItem(
            "Country of residence",
            registration.country_of_residence
        );
        addDetailItem("Career area", registration.career_area);
        addDetailItem(
            "Professional experience",
            registration.professional_experience
        );
        addDetailItem(
            "Working preference",
            registration.working_preference
        );

        addDivider();

        addDetailItem(
            "Skills and experience",
            registration.skills,
            true
        );

        addDetailItem(
            "Additional information",
            registration.additional_info,
            true
        );

        addDivider();

        addDetailItem(
            "Privacy acknowledgement",
            registration.privacy_consent ? "Confirmed" : "Not confirmed"
        );

        addDetailItem(
            "Notification email status",
            capitalise(registration.email_status || "unknown")
        );

        addDetailItem(
            "Last updated",
            formatDate(registration.updated_at)
        );

        elements.detailStatus.value =
            STATUSES.includes(registration.status)
                ? registration.status
                : "new";
    }

    function addDetailItem(labelText, value, fullWidth) {
        const wrapper = document.createElement("div");

        wrapper.className = "registration-detail-item";

        if (fullWidth) {
            wrapper.classList.add("full-width");
        }

        const label = document.createElement("label");
        label.textContent = labelText;

        const paragraph = document.createElement("p");

        const cleanValue =
            value === null || value === undefined || value === ""
                ? "Not provided"
                : String(value);

        paragraph.textContent = cleanValue;

        if (cleanValue === "Not provided") {
            paragraph.classList.add("registration-muted");
        }

        wrapper.append(label, paragraph);
        elements.detailContent.appendChild(wrapper);
    }

    function addDivider() {
        const divider = document.createElement("div");
        divider.className = "registration-detail-divider";

        elements.detailContent.appendChild(divider);
    }

    function closeDetails() {
        elements.detailPanel.classList.remove("visible");
        state.selectedRegistration = null;
    }

    // --------------------------------------------------------
    // STATUS UPDATE FROM DETAIL VIEW
    // --------------------------------------------------------

    async function saveDetailStatus() {
        if (!state.selectedRegistration) {
            showMessage(
                "Please open a candidate registration first.",
                "error"
            );
            return;
        }

        const registrationId = state.selectedRegistration.id;
        const newStatus = elements.detailStatus.value;

        elements.saveDetailStatus.disabled = true;
        elements.saveDetailStatus.textContent = "Saving...";

        const updated = await updateRegistrationStatus(
            registrationId,
            newStatus
        );

        elements.saveDetailStatus.disabled = false;
        elements.saveDetailStatus.textContent = "Save status";

        if (!updated) {
            return;
        }

        state.selectedRegistration = updated;
        renderDetails(updated);

        await loadRegistrations();
    }

    // --------------------------------------------------------
    // USER INTERFACE HELPERS
    // --------------------------------------------------------

    function setLoading(loading) {
        elements.refreshButton.disabled = loading;
        elements.refreshButton.textContent =
            loading ? "Loading..." : "Refresh registrations";

        elements.previousButton.disabled =
            loading || state.page <= 1;

        elements.nextButton.disabled = loading;
    }

    function showMessage(message, type) {
        elements.message.textContent = message;
        elements.message.className =
            "registration-message visible " + (type || "info");
    }

    function clearMessage() {
        elements.message.textContent = "";
        elements.message.className = "registration-message";
    }

    function formatDate(value) {
        if (!value) {
            return "Not available";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function capitalise(value) {
        if (!value) {
            return "Unknown";
        }

        return String(value).charAt(0).toUpperCase() +
            String(value).slice(1);
    }

})();