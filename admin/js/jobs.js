
(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;

    if (!admin || !admin.requireLogin()) return;

    const byId = (id) => document.getElementById(id);

    const table = byId("jobs-table");
    const message = byId("jobs-message");
    const searchInput = byId("jobs-search");
    const statusFilter = byId("jobs-status-filter");
    const refreshButton = byId("refresh-jobs");
    const clearButton = byId("clear-job-filters");
    const resultsCount = byId("jobs-results-count");
    const emptyState = byId("jobs-empty-state");

    byId("logout-button")?.addEventListener("click", () => {
      admin.logout();
    });

    if (!table || !message) {
      console.error("AVERRA jobs page is missing required elements.");
      return;
    }

    let allJobs = [];
    let loading = false;

    function showMessage(text, type = "") {
      message.textContent = text;
      message.className = "message";

      if (type) message.classList.add(type);
    }

    function normaliseJobs(response) {
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.items)) return response.items;
      if (Array.isArray(response?.jobs)) return response.jobs;
      if (Array.isArray(response?.results)) return response.results;

      throw new Error(
        "The jobs API returned an unexpected response format."
      );
    }

    function createCell(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    function makeButton(label, className, action) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = `btn ${className}`;
      button.textContent = label;
      button.addEventListener("click", action);

      return button;
    }

    function renderEmptyRow(text) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.className = "empty-state";
      cell.textContent = text;

      row.appendChild(cell);
      table.appendChild(row);
    }

    function getFilteredJobs() {
      const query = (searchInput?.value || "")
        .trim()
        .toLowerCase();

      const selectedStatus = statusFilter?.value || "all";

      return allJobs.filter((job) => {
        const searchableText = [
          job.title,
          job.department,
          job.location,
          job.employment_type,
          job.summary
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchableText.includes(query);

        const matchesStatus =
          selectedStatus === "all" ||
          job.status === selectedStatus;

        return matchesSearch && matchesStatus;
      });
    }

    function renderJobs() {
      table.replaceChildren();

      const filteredJobs = getFilteredJobs();

      if (resultsCount) {
        resultsCount.textContent =
          `Showing ${filteredJobs.length} of ${allJobs.length} vacancies`;
      }

      if (emptyState) {
        emptyState.hidden = filteredJobs.length > 0;
      }

      if (filteredJobs.length === 0) {
        renderEmptyRow(
          allJobs.length === 0
            ? "No vacancies yet. Add your first job."
            : "No vacancies match your current filters."
        );
        return;
      }

      filteredJobs.forEach((job) => {
        const row = document.createElement("tr");

        row.appendChild(
          createCell(job.title || "Untitled")
        );

        row.appendChild(
          createCell(job.location || "Not specified")
        );

        row.appendChild(
          createCell(job.employment_type || "Not specified")
        );

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        const status = String(job.status || "draft").toLowerCase();
        const validStatuses = ["draft", "published", "closed"];

        badge.className =
          `status ${validStatuses.includes(status) ? status : "draft"}`;
        badge.textContent = status;

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionsCell = document.createElement("td");
        const actionGroup = document.createElement("div");

        actionGroup.className = "actions";

        actionGroup.appendChild(
          makeButton("Edit", "btn-secondary", () => {
            window.location.href =
              `job-form.html?id=${encodeURIComponent(job.id)}`;
          })
        );

        if (status !== "published") {
          actionGroup.appendChild(
            makeButton("Publish", "btn-primary", () => {
              changeStatus(job, "published");
            })
          );
        }

        if (status !== "closed") {
          actionGroup.appendChild(
            makeButton("Close", "btn-danger", () => {
              changeStatus(job, "closed");
            })
          );
        }

        actionsCell.appendChild(actionGroup);
        row.appendChild(actionsCell);
        table.appendChild(row);
      });
    }

    async function changeStatus(job, newStatus) {
      const verb = newStatus === "published" ? "publish" : "close";

      const confirmed = window.confirm(
        `Are you sure you want to ${verb} "${job.title || "this vacancy"}"?`
      );

      if (!confirmed) return;

      try {
        showMessage(`${verb === "publish" ? "Publishing" : "Closing"} vacancy…`);

        await admin.api(`/api/admin/jobs/${encodeURIComponent(job.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus })
        });

        showMessage(`Vacancy ${verb}ed successfully.`, "success");

        await loadJobs(false);
      } catch (error) {
        showMessage(
          `Could not update vacancy: ${error.message}`,
          "error"
        );
      }
    }

    async function loadJobs(showLoadingMessage = true) {
      if (loading) return;

      loading = true;

      if (refreshButton) refreshButton.disabled = true;

      if (showLoadingMessage) {
        showMessage("Loading vacancies…");
      }

      try {
        const response = await admin.api("/api/admin/jobs");

        allJobs = normaliseJobs(response);
        renderJobs();

        showMessage(
          `${allJobs.length} vacancy/vacancies loaded.`,
          "success"
        );
      } catch (error) {
        console.error("AVERRA jobs loading error:", error);

        showMessage(
          `Unable to load vacancies: ${error.message}`,
          "error"
        );

        table.replaceChildren();
        renderEmptyRow("Could not load vacancies. Please try again.");

        if (resultsCount) resultsCount.textContent = "";
      } finally {
        loading = false;

        if (refreshButton) refreshButton.disabled = false;
      }
    }

    searchInput?.addEventListener("input", renderJobs);
    statusFilter?.addEventListener("change", renderJobs);

    refreshButton?.addEventListener("click", () => {
      loadJobs();
    });

    clearButton?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "all";

      renderJobs();
      showMessage("Filters cleared.", "success");
    });

    await loadJobs();
  });
})();
