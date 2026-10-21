
(() => {
  "use strict";

  /*
   * AVERRA STAFFING SOLUTIONS LTD
   * Admin vacancy form
   * Version 3.0.0
   *
   * Requires:
   * - admin/js/auth.js
   * - admin/css/admin.css
   * - FastAPI admin job endpoints
   */

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;

    if (!admin || !admin.requireLogin()) {
      return;
    }

    const form = document.getElementById("job-form");
    const message = document.getElementById("form-message");
    const saveButton = document.getElementById("save-button");
    const formTitle = document.getElementById("form-title");
    const logoutButton = document.getElementById("logout-button");

    logoutButton?.addEventListener("click", () => admin.logout());

    if (!form || !message || !saveButton) {
      console.error("AVERRA job form is missing required elements.");
      return;
    }

    const originalButtonText =
      saveButton.textContent.trim() || "Save vacancy";

    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    let submitting = false;
    let loading = false;

    if (jobId && !/^[1-9]\d*$/.test(jobId)) {
      showMessage("Invalid vacancy ID.", "error");
      saveButton.disabled = true;
      return;
    }

    function showMessage(text, type = "") {
      message.textContent = text;
      message.className = "message";

      if (type) {
        message.classList.add(type);
      }
    }

    function getField(name) {
      return form.elements.namedItem(name);
    }

    function getValue(name) {
      const field = getField(name);

      return field
        ? String(field.value ?? "").trim()
        : "";
    }

    function setValue(name, value) {
      const field = getField(name);

      if (!field) return;

      if (name === "closing_date" && value) {
        field.value = String(value).slice(0, 10);
        return;
      }

      field.value = value == null ? "" : String(value);
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

    function todayLocalDate() {
      const now = new Date();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    function validateForm() {
      if (!form.reportValidity()) {
        return false;
      }

      const requiredFields = [
        ["title", "Enter a job title."],
        ["location", "Enter the job location."],
        ["summary", "Enter a short job summary."],
        ["description", "Enter the full job description."]
      ];

      for (const [name, errorMessage] of requiredFields) {
        if (!getValue(name)) {
          showMessage(errorMessage, "error");
          getField(name)?.focus();
          return false;
        }
      }

      const employmentType = getValue("employment_type");

      const allowedEmploymentTypes = [
        "Full-time",
        "Part-time",
        "Contract",
        "Temporary",
        "Freelance",
        "Internship"
      ];

      if (
        employmentType &&
        !allowedEmploymentTypes.includes(employmentType)
      ) {
        showMessage(
          "Select a valid employment type.",
          "error"
        );
        getField("employment_type")?.focus();
        return false;
      }

      const status = getValue("status");

      if (
        status &&
        !["draft", "published", "closed"].includes(status)
      ) {
        showMessage("Select a valid vacancy status.", "error");
        getField("status")?.focus();
        return false;
      }

      const email = getValue("application_email");
      const emailField = getField("application_email");

      if (
        email &&
        emailField &&
        !emailField.validity.valid
      ) {
        showMessage(
          "Enter a valid application email address.",
          "error"
        );
        emailField.focus();
        return false;
      }

      const closingDate = getValue("closing_date");
      const closingDateField = getField("closing_date");

      if (closingDate) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(closingDate) ||
          Number.isNaN(Date.parse(`${closingDate}T00:00:00`))
        ) {
          showMessage(
            "Enter a valid vacancy closing date.",
            "error"
          );
          closingDateField?.focus();
          return false;
        }

        if (closingDate < todayLocalDate()) {
          showMessage(
            "The closing date cannot be in the past.",
            "error"
          );
          closingDateField?.focus();
          return false;
        }
      }

      return true;
    }

    function buildPayload() {
      const payload = {
        title: getValue("title"),
        department: getValue("department") || null,
        location: getValue("location"),
        employment_type: getValue("employment_type"),
        salary_range: getValue("salary_range") || null,
        summary: getValue("summary"),
        description: getValue("description"),
        application_email: getValue("application_email") || null,
        status: getValue("status") || "draft"
      };

      if (getField("closing_date")) {
        payload.closing_date = getValue("closing_date") || null;
      }

      return payload;
    }

    function setFormDisabled(disabled) {
      const controls = form.querySelectorAll(
        "input, select, textarea, button"
      );

      controls.forEach((control) => {
        if (control === saveButton) return;

        control.disabled = disabled;
      });
    }

    async function loadVacancy(id) {
      loading = true;
      saveButton.disabled = true;
      setFormDisabled(true);

      if (formTitle) {
        formTitle.textContent = "Edit vacancy";
      }

      showMessage("Loading vacancy…");

      try {
        /*
         * Uses the existing admin jobs-list endpoint to remain
         * compatible with the current backend integration.
         *
         * If the endpoint is paginated, a vacancy outside the
         * returned page may not be found.
         */
        const response = await admin.api("/api/admin/jobs");
        const jobs = normaliseJobs(response);

        const job = jobs.find(
          (item) => String(item.id) === String(id)
        );

        if (!job) {
          throw new Error(
            "Vacancy not found in the jobs returned by the API. It may be outside the current page or may have been deleted."
          );
        }

        const fieldNames = [
          "title",
          "department",
          "location",
          "employment_type",
          "salary_range",
          "summary",
          "description",
          "application_email",
          "status",
          "closing_date"
        ];

        fieldNames.forEach((name) => {
          setValue(name, job[name]);
        });

        showMessage(
          `Vacancy #${job.id} loaded. You can now edit it.`,
          "success"
        );
      } finally {
        loading = false;
        setFormDisabled(false);
        saveButton.disabled = false;
      }
    }

    if (jobId) {
      try {
        await loadVacancy(jobId);
      } catch (error) {
        console.error("AVERRA vacancy loading error:", error);

        showMessage(
          `Unable to load vacancy: ${
            error.message || "An unexpected error occurred."
          }`,
          "error"
        );

        saveButton.disabled = true;
        setFormDisabled(true);
        return;
      }
    } else {
      if (formTitle) {
        formTitle.textContent = "Create vacancy";
      }

      if (getField("status") && !getValue("status")) {
        setValue("status", "draft");
      }

      showMessage(
        "Complete the details below to create a vacancy."
      );
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (submitting || loading || !validateForm()) {
        return;
      }

      submitting = true;
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
      setFormDisabled(true);

      showMessage("Saving vacancy…");

      try {
        const payload = buildPayload();

        if (jobId) {
          await admin.api(`/api/admin/jobs/${jobId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
        } else {
          await admin.api("/api/admin/jobs", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }

        showMessage(
          jobId
            ? "Vacancy updated successfully."
            : "Vacancy created successfully.",
          "success"
        );

        saveButton.textContent = "Saved";

        window.location.assign("jobs.html");
      } catch (error) {
        console.error("AVERRA vacancy saving error:", error);

        showMessage(
          `Could not save vacancy: ${
            error.message || "An unexpected error occurred."
          }`,
          "error"
        );

        submitting = false;
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        setFormDisabled(false);
      }
    });
  });
})();
