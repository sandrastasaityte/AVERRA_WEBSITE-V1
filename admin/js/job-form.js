
(() => {
  "use strict";

  /*
   * ============================================================
   * AVERRA STAFFING SOLUTIONS LTD
   * File: admin/js/job-form.js
   * Version: 3.4.0
   * ============================================================
   *
   * Administrator vacancy create/edit form.
   *
   * Requires:
   * - admin/js/auth.js
   * - admin/css/admin.css
   *
   * Backend:
   * - GET    /api/admin/jobs
   * - POST   /api/admin/jobs
   * - PATCH  /api/admin/jobs/{job_id}
   * - DELETE /api/admin/jobs/{job_id}
   *
   * IMPORTANT:
   * This file uses the shared AVERRA_ADMIN authentication system.
   * It does not store or expose the administrator token itself.
   * ============================================================
   */

  const API_TIMEOUT_MS = 20000;

  const VALID_EMPLOYMENT_TYPES = new Set([
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Freelance",
    "Internship"
  ]);

  const VALID_STATUSES = new Set([
    "draft",
    "published",
    "closed"
  ]);

  let form;
  let messageElement;
  let saveButton;
  let deleteButton;
  let titleElement;
  let admin;
  let jobId = null;
  let isSaving = false;
  let originalDeleteButtonDisplay = "";

  function getElement(id) {
    return document.getElementById(id);
  }

  function getField(name) {
    return form
      ? form.querySelector(`[name="${name}"]`) ||
          getElement(name)
      : getElement(name);
  }

  function setMessage(message, type = "info") {
    if (!messageElement) {
      console[type === "error" ? "error" : "log"](
        "[AVERRA job form]",
        message
      );
      return;
    }

    messageElement.textContent = message;
    messageElement.classList.remove(
      "success",
      "error",
      "info",
      "message-success",
      "message-error",
      "message-info"
    );

    messageElement.hidden = false;
    messageElement.setAttribute("role", "status");

    if (type === "success") {
      messageElement.classList.add("success", "message-success");
    } else if (type === "error") {
      messageElement.classList.add("error", "message-error");
      messageElement.setAttribute("role", "alert");
    } else {
      messageElement.classList.add("info", "message-info");
    }
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

  function getValue(name) {
    const field = getField(name);
    return field && typeof field.value === "string"
      ? field.value.trim()
      : "";
  }

  function setValue(name, value) {
    const field = getField(name);

    if (!field) return;

    if (value === null || value === undefined) {
      field.value = "";
    } else if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      field.value = String(value);
    } else {
      field.value = "";
    }
  }

  function setSavingState(saving) {
    isSaving = saving;

    if (saveButton) {
      saveButton.disabled = saving;
      saveButton.textContent = saving
        ? "Saving..."
        : jobId
          ? "Save Changes"
          : "Create Vacancy";
    }

    if (form) {
      form.querySelectorAll(
        "input, textarea, select, button"
      ).forEach((element) => {
        if (element === saveButton) return;

        if (element === deleteButton) {
          element.disabled = saving;
          return;
        }

        element.disabled = saving;
      });
    }

    if (deleteButton) {
      deleteButton.disabled = saving;
    }
  }

  function normaliseJobs(response) {
    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== "object") {
      return [];
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.jobs)) {
      return response.jobs;
    }

    if (Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }

  function getJobIdentifier(job) {
    if (!job || typeof job !== "object") {
      return null;
    }

    return job.id ?? job.job_id ?? null;
  }

  function getJobDateValue(value) {
    if (!value) return "";

    const text = String(value);

    // An HTML date input requires YYYY-MM-DD.
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);

    return match ? match[1] : "";
  }

  function formatApiError(error) {
    if (!error) {
      return "An unexpected error occurred. Please try again.";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error.detail) {
      if (typeof error.detail === "string") {
        return error.detail;
      }

      if (Array.isArray(error.detail)) {
        return error.detail
          .map((item) => item.msg || JSON.stringify(item))
          .join(" ");
      }

      return JSON.stringify(error.detail);
    }

    if (error.message) {
      return error.message;
    }

    return "An unexpected error occurred. Please try again.";
  }

  async function apiRequest(path, options = {}) {
    if (!admin || typeof admin.api !== "function") {
      throw new Error(
        "Administrator API is unavailable. Check that admin/js/auth.js loads before this file."
      );
    }

    /*
     * Prefer the shared authentication API so the administrator token
     * is added centrally and is not duplicated in this file.
     */
    const requestOptions = {
      ...options,
      timeout: options.timeout || API_TIMEOUT_MS
    };

    return admin.api(path, requestOptions);
  }

  function validateJobId(value) {
    if (!/^[1-9]\d*$/.test(String(value))) {
      throw new Error(
        "The vacancy ID is invalid. Return to Jobs and open the vacancy again."
      );
    }
  }

  function validateForm() {
    const title = getValue("title");
    const location = getValue("location");
    const summary = getValue("summary");
    const description = getValue("description");
    const employmentType = getValue("employment_type");
    const statusValue = getValue("status");
    const email = getValue("application_email");
    const closingDate = getValue("closing_date");

    if (!title) {
      throw new Error("Please enter a vacancy title.");
    }

    if (title.length > 200) {
      throw new Error(
        "The vacancy title must be 200 characters or fewer."
      );
    }

    if (!location) {
      throw new Error("Please enter the vacancy location.");
    }

    if (!summary) {
      throw new Error("Please enter a short vacancy summary.");
    }

    if (!description) {
      throw new Error("Please enter the vacancy description.");
    }

    if (
      employmentType &&
      !VALID_EMPLOYMENT_TYPES.has(employmentType)
    ) {
      throw new Error(
        "Please select a valid employment type."
      );
    }

    if (!statusValue || !VALID_STATUSES.has(statusValue)) {
      throw new Error(
        "Please select Draft, Published or Closed."
      );
    }

    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email) || email.length > 254) {
        throw new Error(
          "Please enter a valid application email address."
        );
      }
    }

    if (closingDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
        throw new Error(
          "Please enter a valid closing date."
        );
      }

      const parsedDate = new Date(
        `${closingDate}T00:00:00Z`
      );

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== closingDate
      ) {
        throw new Error(
          "Please enter a valid calendar date for the closing date."
        );
      }

      /*
       * Do not reject historical dates here. The backend's JobUpdate
       * schema and application submission logic remain authoritative.
       * Administrators may need to edit an expired vacancy.
       */
    }

    const payload = {
      title,
      location,
      summary,
      description,
      status: statusValue
    };

    const department = getValue("department");
    const salaryRange = getValue("salary_range");

    if (department) {
      payload.department = department;
    }

    if (employmentType) {
      payload.employment_type = employmentType;
    }

    if (salaryRange) {
      payload.salary_range = salaryRange;
    }

    if (email) {
      payload.application_email = email;
    }

    /*
     * Include closing_date only if the form contains that field.
     * An empty date is sent as null so an administrator can clear it,
     * provided the backend schema permits null.
     */
    const closingDateField = getField("closing_date");

    if (closingDateField) {
      payload.closing_date = closingDate || null;
    }

    return payload;
  }

  function populateForm(job) {
    setValue("job-id", getJobIdentifier(job));
    setValue("title", job.title);
    setValue("department", job.department);
    setValue("location", job.location);
    setValue("employment_type", job.employment_type);
    setValue("salary_range", job.salary_range);
    setValue("summary", job.summary);
    setValue("description", job.description);
    setValue("application_email", job.application_email);
    setValue("status", job.status || "draft");
    setValue("closing_date", getJobDateValue(job.closing_date));

    if (titleElement) {
      titleElement.textContent = "Edit Vacancy";
    }

    if (deleteButton) {
      deleteButton.hidden = false;
      deleteButton.style.display =
        originalDeleteButtonDisplay || "";
    }

    if (saveButton) {
      saveButton.textContent = "Save Changes";
    }
  }

  async function loadVacancy(id) {
    validateJobId(id);

    setMessage("Loading vacancy...", "info");

    const response = await apiRequest("/api/admin/jobs", {
      method: "GET"
    });

    const jobs = normaliseJobs(response);

    const job = jobs.find((item) => {
      return String(getJobIdentifier(item)) === String(id);
    });

    if (!job) {
      throw new Error(
        "The vacancy could not be found. It may have been deleted or may not be included in the current results."
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
      payload = validateForm();
    } catch (error) {
      setMessage(formatApiError(error), "error");
      return;
    }

    setSavingState(true);

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

        setMessage(
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

        const createdId = getJobIdentifier(response);

        if (createdId !== null && createdId !== undefined) {
          jobId = String(createdId);

          const url = new URL(window.location.href);
          url.searchParams.set("id", jobId);
          window.history.replaceState({}, "", url.toString());

          if (deleteButton) {
            deleteButton.hidden = false;
            deleteButton.style.display =
              originalDeleteButtonDisplay || "";
          }

          if (titleElement) {
            titleElement.textContent = "Edit Vacancy";
          }
        }

        setMessage(
          "Vacancy created successfully.",
          "success"
        );
      }

      if (response && typeof response === "object") {
        const returnedId = getJobIdentifier(response);

        if (returnedId !== null && returnedId !== undefined) {
          setValue("job-id", returnedId);
        }
      }
    } catch (error) {
      console.error(
        "[AVERRA job form] Save failed:",
        error
      );

      setMessage(
        formatApiError(error),
        "error"
      );
    } finally {
      setSavingState(false);
    }
  }

  async function handleDelete() {
    if (!jobId || isSaving) {
      setMessage(
        "Save the vacancy before attempting to delete it.",
        "error"
      );
      return;
    }

    validateJobId(jobId);

    const confirmed = window.confirm(
      "Are you sure you want to delete this vacancy?\n\n" +
      "This action cannot be undone. Vacancies with linked applications " +
      "cannot be deleted; close or unpublish them instead."
    );

    if (!confirmed) return;

    clearMessage();
    setSavingState(true);

    try {
      await apiRequest(
        `/api/admin/jobs/${encodeURIComponent(jobId)}`,
        {
          method: "DELETE"
        }
      );

      setMessage(
        "Vacancy deleted successfully. Returning to the Jobs page...",
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

      setMessage(
        formatApiError(error),
        "error"
      );

      setSavingState(false);
    }
  }

  function bindEvents() {
    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();

        handleDelete().catch((error) => {
          console.error(
            "[AVERRA job form] Delete handler failed:",
            error
          );

          setMessage(formatApiError(error), "error");
        });
      });
    }
  }

  async function initialiseJobForm() {
    form = getElement("job-form");
    messageElement = getElement("form-message");
    saveButton = getElement("save-button");
    deleteButton = getElement("delete-button");
    titleElement = getElement("form-title");

    if (!form) {
      console.error(
        "[AVERRA job form] Required element #job-form was not found."
      );
      return;
    }

    if (!saveButton) {
      console.error(
        "[AVERRA job form] Required element #save-button was not found."
      );
      return;
    }

    if (deleteButton) {
      originalDeleteButtonDisplay = deleteButton.style.display;
    }

    admin = window.AVERRA_ADMIN;

    if (
      !admin ||
      typeof admin.api !== "function" ||
      typeof admin.requireLogin !== "function"
    ) {
      setMessage(
        "Administrator authentication did not load. Check that auth.js is included before job-form.js.",
        "error"
      );
      return;
    }

    /*
     * Bind events only after the page has the expected elements
     * and the shared administrator API is available.
     */
    bindEvents();

    try {
      await admin.requireLogin();
    } catch (error) {
      console.error(
        "[AVERRA job form] Authentication check failed:",
        error
      );

      setMessage(
        "Administrator authentication failed. Please sign in again.",
        "error"
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
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

        setMessage(
          formatApiError(error),
          "error"
        );
      }
    } else {
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

      setValue("status", "draft");
      clearMessage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initialiseJobForm().catch((error) => {
          console.error(
            "[AVERRA job form] Initialisation failed:",
            error
          );

          setMessage(
            formatApiError(error),
            "error"
          );
        });
      },
      { once: true }
    );
  } else {
    initialiseJobForm().catch((error) => {
      console.error(
        "[AVERRA job form] Initialisation failed:",
        error
      );

      setMessage(
        formatApiError(error),
        "error"
      );
    });
  }
})();
