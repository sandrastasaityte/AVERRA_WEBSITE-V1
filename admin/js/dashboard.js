
(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;

    if (!admin || !admin.requireLogin()) {
      return;
    }

    const getElement = (id) => document.getElementById(id);

    const message = getElement("dashboard-message");
    const recentJobs = getElement("recent-jobs");
    const totalJobs = getElement("total-jobs");
    const publishedJobs = getElement("published-jobs");
    const draftJobs = getElement("draft-jobs");

    getElement("logout-button")?.addEventListener("click", () => {
      admin.logout();
    });

    function showMessage(text, type) {
      if (!message) return;

      message.textContent = text;
      message.className = "message";

      if (type) {
        message.classList.add(type);
      }
    }

    function addCell(row, value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
      return cell;
    }

    function showEmptyState(text) {
      if (!recentJobs) return;

      recentJobs.replaceChildren();

      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 3;
      cell.textContent = text;

      row.appendChild(cell);
      recentJobs.appendChild(row);
    }

    function normaliseJobs(response) {
      // Support a plain array.
      if (Array.isArray(response)) {
        return response;
      }

      // Support common paginated API response formats.
      if (response && Array.isArray(response.items)) {
        return response.items;
      }

      if (response && Array.isArray(response.jobs)) {
        return response.jobs;
      }

      if (response && Array.isArray(response.results)) {
        return response.results;
      }

      throw new Error(
        "The jobs API returned an unexpected response format."
      );
    }

    function renderJobs(jobs) {
      if (!recentJobs) return;

      recentJobs.replaceChildren();

      if (jobs.length === 0) {
        showEmptyState("No vacancies yet. Add your first job.");
        return;
      }

      jobs.slice(0, 5).forEach((job) => {
        const row = document.createElement("tr");

        addCell(row, job.title || "Untitled");
        addCell(row, job.location || "Not specified");

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        const status = String(job.status || "draft").toLowerCase();
        const allowedStatuses = ["draft", "published", "closed"];

        badge.className = "status " +
          (allowedStatuses.includes(status) ? status : "draft");

        badge.textContent = status;

        statusCell.appendChild(badge);
        row.appendChild(statusCell);
        recentJobs.appendChild(row);
      });
    }

    try {
      showMessage("Loading dashboard…", "");

      const response = await admin.api("/api/admin/jobs");
      const jobs = normaliseJobs(response);

      const published = jobs.filter(
        (job) => job.status === "published"
      ).length;

      const drafts = jobs.filter(
        (job) => job.status === "draft"
      ).length;

      if (totalJobs) {
        totalJobs.textContent = String(jobs.length);
      }

      if (publishedJobs) {
        publishedJobs.textContent = String(published);
      }

      if (draftJobs) {
        draftJobs.textContent = String(drafts);
      }

      renderJobs(jobs);

      showMessage("Dashboard loaded successfully.", "success");
    } catch (error) {
      console.error("AVERRA dashboard error:", error);

      showMessage(
        `Unable to load dashboard: ${error.message}`,
        "error"
      );

      showEmptyState("Could not load vacancies. Please try again.");
    }
  });
})();
