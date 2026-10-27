
(() => {
  "use strict";

  /*
   * AVERRA STAFFING SOLUTIONS LTD
   * File: admin/js/dashboard.js
   * Version: 2.1.0
   *
   * Compatible with admin/js/auth.js versions 3.x.
   */

  document.addEventListener("DOMContentLoaded", initialise);

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

    function showMessage(text, type = "") {
      if (!elements.message) return;

      elements.message.textContent = text;
      elements.message.className = "message";

      if (type) {
        elements.message.classList.add(type);
      }
    }

    function setMetric(element, value) {
      if (element) element.textContent = String(value);
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

    function setLoadingState() {
      setMetric(elements.totalJobs, "—");
      setMetric(elements.publishedJobs, "—");
      setMetric(elements.draftJobs, "—");

      showMessage("Loading dashboard…");
      showEmptyState("Loading vacancies…");

      if (retryButton) retryButton.hidden = true;
    }

    function normaliseJobs(response) {
      if (Array.isArray(response)) return response;
      if (response && Array.isArray(response.items)) return response.items;
      if (response && Array.isArray(response.jobs)) return response.jobs;
      if (response && Array.isArray(response.results)) return response.results;

      throw new Error("The jobs API returned an unexpected response format.");
    }

    function getStatus(job) {
      const status = String(job.status || "draft").trim().toLowerCase();

      return ["draft", "published", "closed"].includes(status)
        ? status
        : "draft";
    }

    function getTimestamp(job) {
      const value = job.created_at || job.updated_at;
      if (!value) return 0;

      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function addCell(row, value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    function renderJobs(jobs) {
      if (!elements.recentJobs) return;

      elements.recentJobs.replaceChildren();

      if (!jobs.length) {
        showEmptyState("No vacancies found. Add your first job to get started.");
        return;
      }

      [...jobs]
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, 5)
        .forEach((job) => {
          const row = document.createElement("tr");

          addCell(row, String(job.title || "Untitled vacancy"));
          addCell(row, String(job.location || "Not specified"));

          const statusCell = document.createElement("td");
          const badge = document.createElement("span");
          const status = getStatus(job);

          badge.className = `status ${status}`;
          badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);

          statusCell.appendChild(badge);
          row.appendChild(statusCell);
          elements.recentJobs.appendChild(row);
        });
    }

    function updateStatistics(jobs) {
      setMetric(elements.totalJobs, jobs.length);
      setMetric(
        elements.publishedJobs,
        jobs.filter((job) => getStatus(job) === "published").length
      );
      setMetric(
        elements.draftJobs,
        jobs.filter((job) => getStatus(job) === "draft").length
      );
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
        elements.message.insertAdjacentElement("afterend", retryButton);
      }

      return retryButton;
    }

    function showError(error) {
      console.error("AVERRA dashboard error:", error);

      showMessage(
        `Unable to load the dashboard: ${error.message || "Unexpected error."}`,
        "error"
      );

      showEmptyState("Vacancies could not be loaded. Check your connection and try again.");

      setMetric(elements.totalJobs, "—");
      setMetric(elements.publishedJobs, "—");
      setMetric(elements.draftJobs, "—");

      ensureRetryButton().hidden = false;
    }

    async function loadDashboard() {
      if (isLoading) return;

      isLoading = true;
      setLoadingState();

      if (retryButton) {
        retryButton.disabled = true;
        retryButton.textContent = "Loading…";
      }

      try {
        // Resolve auth after DOM readiness rather than capturing it too early.
        const admin = window.AVERRA_ADMIN;

        if (!admin || typeof admin.api !== "function") {
          throw new Error(
            "The authentication script is missing or failed to initialise. Check the Network tab for admin/js/auth.js and the Console for its first error."
          );
        }

        if (typeof admin.requireLogin === "function") {
          const permitted = await admin.requireLogin();

          if (!permitted) return;
        } else if (
          typeof admin.getToken === "function" &&
          !admin.getToken()
        ) {
          if (typeof admin.logout === "function") admin.logout();
          return;
        } else if (
          typeof admin.isAuthenticated === "function" &&
          !admin.isAuthenticated()
        ) {
          if (typeof admin.logout === "function") admin.logout();
          return;
        }

        const response = await admin.api("/api/admin/jobs");
        const jobs = normaliseJobs(response);

        updateStatistics(jobs);
        renderJobs(jobs);

        showMessage(
          `Dashboard loaded. ${jobs.length} job record${jobs.length === 1 ? "" : "s"} returned by the API.`,
          "success"
        );

        if (retryButton) retryButton.hidden = true;
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

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener("click", (event) => {
        event.preventDefault();

        const admin = window.AVERRA_ADMIN;

        if (admin && typeof admin.logout === "function") {
          admin.logout();
        } else {
          showMessage("The authentication script is unavailable.", "error");
        }
      });
    }

    if (elements.refreshButton) {
      elements.refreshButton.addEventListener("click", loadDashboard);
    }

    await loadDashboard();
  }
})();
