
(() => {
  "use strict";

  /*
   * AVERRA STAFFING SOLUTIONS LTD
   * Admin dashboard
   * Version 2.0.0
   *
   * Compatible with:
   * - admin/js/auth.js
   * - admin/dashboard.html
   * - admin/css/admin.css
   * - GET /api/admin/jobs
   */

  document.addEventListener("DOMContentLoaded", () => {
    const admin = window.AVERRA_ADMIN;

    const elements = {
      message: document.getElementById("dashboard-message"),
      recentJobs: document.getElementById("recent-jobs"),
      totalJobs: document.getElementById("total-jobs"),
      publishedJobs: document.getElementById("published-jobs"),
      draftJobs: document.getElementById("draft-jobs"),
      logoutButton: document.getElementById("logout-button")
    };

    let retryButton = null;
    let isLoading = false;

    function showMessage(text, type = "") {
      if (!elements.message) return;

      elements.message.textContent = text;
      elements.message.className = "message";

      if (type) {
        elements.message.classList.add(type);
      }
    }

    function setMetric(element, value) {
      if (element) {
        element.textContent = String(value);
      }
    }

    function setLoadingState() {
      setMetric(elements.totalJobs, "—");
      setMetric(elements.publishedJobs, "—");
      setMetric(elements.draftJobs, "—");

      showMessage("Loading dashboard…");

      if (retryButton) {
        retryButton.hidden = true;
      }

      showEmptyState("Loading vacancies…");
    }

    function showEmptyState(text) {
      if (!elements.recentJobs) return;

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
      cell.textContent = value;
      row.appendChild(cell);
      return cell;
    }

    function normaliseJobs(response) {
      if (Array.isArray(response)) {
        return response;
      }

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

    function getStatus(job) {
      const status = String(job.status || "draft")
        .trim()
        .toLowerCase();

      const allowedStatuses = ["draft", "published", "closed"];

      return allowedStatuses.includes(status) ? status : "draft";
    }

    function getTimestamp(job) {
      const value = job.created_at || job.updated_at;

      if (!value) return 0;

      const timestamp = Date.parse(value);

      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function sortNewestFirst(jobs) {
      return [...jobs].sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
      );
    }

    function renderJobs(jobs) {
      if (!elements.recentJobs) return;

      elements.recentJobs.replaceChildren();

      if (jobs.length === 0) {
        showEmptyState(
          "No vacancies found. Add your first job to get started."
        );
        return;
      }

      const sortedJobs = sortNewestFirst(jobs);

      sortedJobs.slice(0, 5).forEach((job) => {
        const row = document.createElement("tr");

        addCell(row, String(job.title || "Untitled vacancy"));
        addCell(row, String(job.location || "Not specified"));

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        const status = getStatus(job);

        badge.className = `status ${status}`;
        badge.textContent =
          status.charAt(0).toUpperCase() + status.slice(1);

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        elements.recentJobs.appendChild(row);
      });
    }

    function updateStatistics(jobs) {
      const published = jobs.filter(
        (job) => getStatus(job) === "published"
      ).length;

      const drafts = jobs.filter(
        (job) => getStatus(job) === "draft"
      ).length;

      setMetric(elements.totalJobs, jobs.length);
      setMetric(elements.publishedJobs, published);
      setMetric(elements.draftJobs, drafts);
    }

    function ensureRetryButton() {
      if (retryButton) return retryButton;

      retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "btn btn-secondary";
      retryButton.textContent = "Try again";
      retryButton.style.marginTop = "8px";
      retryButton.addEventListener("click", loadDashboard);

      if (elements.message) {
        elements.message.insertAdjacentElement(
          "afterend",
          retryButton
        );
      }

      return retryButton;
    }

    function showError(error) {
      console.error("AVERRA dashboard error:", error);

      showMessage(
        `Unable to load the dashboard: ${
          error.message || "An unexpected error occurred."
        }`,
        "error"
      );

      showEmptyState(
        "Vacancies could not be loaded. Check your connection and try again."
      );

      setMetric(elements.totalJobs, "—");
      setMetric(elements.publishedJobs, "—");
      setMetric(elements.draftJobs, "—");

      ensureRetryButton().hidden = false;
    }

    async function loadDashboard() {
      if (isLoading) return;

      if (!admin) {
        showMessage(
          "Authentication could not be initialized. Check that js/auth.js loads before js/dashboard.js.",
          "error"
        );
        return;
      }

      if (!admin.requireLogin()) {
        return;
      }

      isLoading = true;
      setLoadingState();

      if (retryButton) {
        retryButton.disabled = true;
        retryButton.textContent = "Loading…";
      }

      try {
        const response = await admin.api("/api/admin/jobs");
        const jobs = normaliseJobs(response);

        updateStatistics(jobs);
        renderJobs(jobs);

        showMessage(
          `Dashboard loaded. ${jobs.length} job record${
            jobs.length === 1 ? "" : "s"
          } returned by the API.`,
          "success"
        );

        if (retryButton) {
          retryButton.hidden = true;
        }
      } catch (error) {
        showError(error);
      } finally {
        isLoading = false;

        if (retryButton) {
          retryButton.disabled = false;
          retryButton.textContent = "Try again";
        }
      }
    }

    if (elements.logoutButton && admin) {
      elements.logoutButton.addEventListener("click", () => {
        admin.logout();
      });
    }

    loadDashboard();
  });
})();
