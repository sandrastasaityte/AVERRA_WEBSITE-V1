
(() => {
  "use strict";

  /*
   * ============================================================
   * AVERRA STAFFING SOLUTIONS LTD
   * File: admin/js/job-form.js
   * Version: 3.7.0
   * ============================================================
   *
   * Administrator vacancy create/edit form.
   *
   * Requires:
   * - admin/js/auth.js
   *
   * Backend:
   * - GET    /api/admin/jobs
   * - POST   /api/admin/jobs
   * - PATCH  /api/admin/jobs/{job_id}
   * - DELETE /api/admin/jobs/{job_id}
   *
   * Authentication is managed centrally by AVERRA_ADMIN.
   * ============================================================
   */

  const API_TIMEOUT_MS = 20000;
  const MAX_JOBS_TO_LOAD = 200;

  const LIMITS = {
    title: 150,
    department: 100,
    location: 150,
    salary_range: 100,
    summary: 500,
    description: 15000,
    application_email: 254
  };

  const EMPLOYMENT_TYPES = new Set([
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Freelance",
    "Internship"
  ]);

  const STATUSES = new Set([
    "draft",
    "published",
    "closed"
  ]);

  let form = null;
  let messageElement = null;
  let saveButton = null;
  let deleteButton = null;
  let titleElement = null;
  let admin = null;

  let jobId = null;
  let isSaving = false;
  let originalDisabledStates = new Map();

  const $ = (id) => document.getElementById(id);

  function field(name) {
    return form?.querySelector(`[name="${name}"]`) || $(name);
  }

  function value(name) {
    const element = field(name);

    return typeof element?.value === "string"
      ? element.value.trim()
      : "";
  }

  function setValue(name, newValue) {
    const element = field(name);

    if (!element) return;

    element.value =
      newValue === null || newValue === undefined
        ? ""
        : String(newValue);
  }

  function showMessage(message, type = "info") {
    const safeType = ["success", "error", "info"].includes(type)
      ? type
      : "info";

    if (!messageElement) {
      const logMethod = safeType === "error" ? "error" : "log";

      console[logMethod]("[AVERRA job form]", message);
      return;
    }

    messageElement.textContent = String(message);
    messageElement.hidden = false;

    messageElement.classList.remove(
      "success",
      "error",
      "info",
      "message-success",
      "message-error",
      "message-info"
    );

    messageElement.classList.add(
      safeType,
      `message-${safeType}`
    );

    messageElement.setAttribute(
      "role",
      safeType === "error" ? "alert" : "status"
    );

    messageElement.setAttribute("aria-live", "polite");
  }

  function clearMessage() {
    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.hidden = true;

    messageElement.classList.remove(
      "success",
      "error",
      "info",
      "message-success",
      "message-error",
      "message-info"
    );
  }

  function apiErrorMessage(error) {
    if (!error) {
      return "An unexpected error occurred. Please try again.";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error.detail !== undefined) {
      if (typeof error.detail === "string") {
        return error.detail;
      }

      if (Array.isArray(error.detail)) {
        return error.detail.map((item) => {
          const message = item?.msg || "Invalid value";

          const location = Array.isArray(item?.loc)
            ? item.loc
                .filter((part) => part !== "body")
                .join(".")
            : "";

          return location
            ? `${location}: ${message}`
            : message;
        }).join(" ");
      }

      try {
        return JSON.stringify(error.detail);
      } catch (_) {
        return "The server rejected the request.";
      }
    }

    return error.message ||
      "An unexpected error occurred. Please try again.";
  }

  async function apiRequest(path, options = {}) {
    if (!admin || typeof admin.api !== "function") {
      throw new Error(
        "The administrator API is unavailable. Check that auth.js loads before job-form.js."
      );
    }

    return admin.api(path, {
      ...options,
      timeout: options.timeout || API_TIMEOUT_MS
    });
  }

  function validateLength(text, min, max, label) {
    if (text.length < min) {
      throw new Error(
        `${label} must contain at least ${min} characters.`
      );
    }

    if (text.length > max) {
      throw new Error(
        `${label} must contain no more than ${max} characters.`
      );
    }
  }

  function validateOptionalLength(text, max, label) {
    if (text.length > max) {
      throw new Error(
        `${label} must contain no more than ${max} characters.`
      );
    }
  }

  function validateDate(dateText) {
    if (!dateText) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      throw new Error("Please enter a valid closing date.");
    }

    const date = new Date(`${dateText}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dateText
    ) {
      throw new Error("Please enter a valid calendar date.");
    }
  }

  function validateJobId(id) {
    if (!/^[1-9]\d*$/.test(String(id))) {
      throw new Error(
        "The vacancy ID is invalid. Return to Jobs and open the vacancy again."
      );
    }
  }

  function buildPayload() {
    const title = value("title");
    const department = value("department");
    const location = value("location");
    const employmentType = value("employment_type");
    const salaryRange = value("salary_range");
    const summary = value("summary");
    const description = value("description");
    const email = value("application_email");
    const closingDate = value("closing_date");
    const status = value("status");

    validateLength(title, 3, LIMITS.title, "Vacancy title");

    validateOptionalLength(
      department,
      LIMITS.department,
      "Department"
    );

    validateLength(
      location,
      2,
      LIMITS.location,
      "Location"
    );

    if (!EMPLOYMENT_TYPES.has(employmentType)) {
      throw new Error("Please select a valid employment type.");
    }

    validateOptionalLength(
      salaryRange,
      LIMITS.salary_range,
      "Salary / rate"
    );

    validateLength(
      summary,
      10,
      LIMITS.summary,
      "Vacancy summary"
    );

    validateLength(
      description,
      20,
      LIMITS.description,
      "Vacancy description"
    );

    if (!STATUSES.has(status)) {
      throw new Error(
        "Please select Draft, Published or Closed."
      );
    }

    if (email) {
      if (
        email.length > LIMITS.application_email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw new Error(
          "Please enter a valid application email address."
        );
      }
    }

    validateDate(closingDate);

    /*
     * Matches JobCreate and JobUpdate in app/schemas/jobs.py.
     * Send closing_date as YYYY-MM-DD, or null when empty.
     */
    return {
      title,
      department: department || null,
      location,
      employment_type: employmentType,
      salary_range: salaryRange || null,
      summary,
      description,
      application_email: email || null,
      closing_date: closingDate || null,
      status
    };
  }

  function setSaving(saving) {
    if (saving === isSaving) return;

    isSaving = saving;

    if (saving) {
      originalDisabledStates = new Map();

      form
        .querySelectorAll("input, textarea, select, button")
        .forEach((element) => {
          originalDisabledStates.set(
            element,
            element.disabled
          );

          element.disabled = true;
        });

      if (saveButton) {
        saveButton.textContent = "Saving...";
      }

      return;
    }

    form
      .querySelectorAll("input, textarea, select, button")
      .forEach((element) => {
        if (originalDisabledStates.has(element)) {
          element.disabled =
            originalDisabledStates.get(element);
        }
      });

    if (saveButton) {
      saveButton.textContent = jobId
        ? "Save Changes"
        : "Create Vacancy";
    }

    originalDisabledStates.clear();
  }

  function getId(job) {
    return job?.id ?? job?.job_id ?? null;
  }

  function normaliseJobs(response) {
    if (Array.isArray(response)) return response;

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.jobs)) {
      return response.jobs;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    throw new Error(
      "The server returned an unexpected vacancy list format."
    );
  }

  function dateForInput(dateValue) {
    if (!dateValue) return "";

    const match = String(dateValue).match(
      /^(\d{4}-\d{2}-\d{2})/
    );

    return match ? match[1] : "";
  }

  function populateForm(job) {
    const id = getId(job);

    if (id === null || id === undefined) {
      throw new Error(
        "The server returned a vacancy without an ID."
      );
    }

    jobId = String(id);

    setValue("job-id", id);
    setValue("title", job.title);
    setValue("department", job.department);
    setValue("location", job.location);
    setValue("employment_type", job.employment_type);
    setValue("salary_range", job.salary_range);
    setValue("summary", job.summary);
    setValue("description", job.description);
    setValue("application_email", job.application_email);
    setValue("closing_date", dateForInput(job.closing_date));
    setValue("status", job.status || "draft");

    if (titleElement) {
      titleElement.textContent = "Edit Vacancy";
    }

    if (deleteButton) {
      deleteButton.hidden = false;
      deleteButton.style.display = "";
    }

    if (saveButton) {
      saveButton.textContent = "Save Changes";
    }
  }

  async function loadVacancy(id) {
    validateJobId(id);

    showMessage("Loading vacancy...", "info");

    const response = await apiRequest(
      `/api/admin/jobs?limit=${MAX_JOBS_TO_LOAD}&offset=0`,
      { method: "GET" }
    );

    const jobs = normaliseJobs(response);

    const job = jobs.find(
      (item) => String(getId(item)) === String(id)
    );

    if (!job) {
      throw new Error(
        `Vacancy #${id} was not found in the returned list. It may have been deleted or may be beyond the first ${MAX_JOBS_TO_LOAD} vacancies.`
      );
    }

    populateForm(job);
    clearMessage();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    clearMessage();

    let payload;

    try {
      payload = buildPayload();
    } catch (error) {
      showMessage(apiErrorMessage(error), "error");
      return;
    }

    setSaving(true);

    try {
      let response;

      if (jobId) {
        validateJobId(jobId);

        response = await apiRequest(
          `/api/admin/jobs/${encodeURIComponent(jobId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        const returnedId = getId(response);

        if (
          returnedId !== null &&
          returnedId !== undefined &&
          String(returnedId) !== String(jobId)
        ) {
          throw new Error(
            "The server returned an unexpected vacancy ID."
          );
        }

        showMessage(
          "Vacancy updated successfully.",
          "success"
        );
      } else {
        response = await apiRequest(
          "/api/admin/jobs",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        const returnedId = getId(response);

        if (
          returnedId === null ||
          returnedId === undefined
        ) {
          throw new Error(
            "The server did not return the new vacancy ID. Check the Jobs list before trying to create the vacancy again."
          );
        }

        validateJobId(returnedId);
        jobId = String(returnedId);

        setValue("job-id", returnedId);

        const url = new URL(window.location.href);
        url.searchParams.set("id", jobId);

        window.history.replaceState(
          {},
          "",
          url.toString()
        );

        if (titleElement) {
          titleElement.textContent = "Edit Vacancy";
        }

        if (deleteButton) {
          deleteButton.hidden = false;
          deleteButton.style.display = "";
        }

        showMessage(
          "Vacancy created successfully.",
          "success"
        );
      }
    } catch (error) {
      console.error(
        "[AVERRA job form] Save failed:",
        error
      );

      showMessage(apiErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isSaving) return;

    if (!jobId) {
      showMessage(
        "Save the vacancy before deleting it.",
        "error"
      );
      return;
    }

    try {
      validateJobId(jobId);
    } catch (error) {
      showMessage(apiErrorMessage(error), "error");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this vacancy?\n\n" +
      "This action cannot be undone. Vacancies with linked applications " +
      "cannot be deleted and must be closed instead."
    );

    if (!confirmed) return;

    clearMessage();
    setSaving(true);

    try {
      await apiRequest(
        `/api/admin/jobs/${encodeURIComponent(jobId)}`,
        { method: "DELETE" }
      );

      showMessage(
        "Vacancy deleted successfully. Returning to Jobs...",
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "jobs.html";
      }, 900);
    } catch (error) {
      console.error(
        "[AVERRA job form] Delete failed:",
        error
      );

      showMessage(apiErrorMessage(error), "error");
      setSaving(false);
    }
  }

  function bindEvents() {
    form.addEventListener("submit", handleSubmit);

    deleteButton?.addEventListener("click", (event) => {
      event.preventDefault();

      handleDelete().catch((error) => {
        console.error(
          "[AVERRA job form] Delete failed:",
          error
        );

        showMessage(apiErrorMessage(error), "error");

        if (isSaving) {
          setSaving(false);
        }
      });
    });
  }

  async function initialise() {
    form = $("job-form");
    messageElement = $("form-message");
    saveButton = $("save-button");
    deleteButton = $("delete-button");
    titleElement = $("form-title");

    if (!form || !saveButton) {
      console.error(
        "[AVERRA job form] Required #job-form or #save-button element missing."
      );
      return;
    }

    admin = window.AVERRA_ADMIN;

    if (
      !admin ||
      typeof admin.api !== "function" ||
      typeof admin.requireLogin !== "function"
    ) {
      showMessage(
        "Administrator authentication did not load. Check that js/auth.js loads before js/job-form.js.",
        "error"
      );
      return;
    }

    bindEvents();

    try {
      const authenticated = await admin.requireLogin();

      if (authenticated === false) return;
    } catch (error) {
      console.error(
        "[AVERRA job form] Authentication failed:",
        error
      );

      showMessage(
        apiErrorMessage(error) ||
          "Administrator authentication failed. Please sign in again.",
        "error"
      );

      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const requestedId = params.get("id");

    if (requestedId) {
      jobId = requestedId.trim();

      try {
        await loadVacancy(jobId);
      } catch (error) {
        console.error(
          "[AVERRA job form] Could not load vacancy:",
          error
        );

        showMessage(apiErrorMessage(error), "error");
      }

      return;
    }

    jobId = null;

    if (titleElement) {
      titleElement.textContent = "Create Vacancy";
    }

    if (deleteButton) {
      deleteButton.hidden = true;
      deleteButton.style.display = "none";
    }

    if (saveButton) {
      saveButton.textContent = "Create Vacancy";
    }

    setValue("job-id", "");
    setValue("status", "draft");

    clearMessage();
  }

  function start() {
    initialise().catch((error) => {
      console.error(
        "[AVERRA job form] Initialisation failed:",
        error
      );

      showMessage(apiErrorMessage(error), "error");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
