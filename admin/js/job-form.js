
(() => {
  "use strict";

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

    const params = new URLSearchParams(location.search);
    const jobId = params.get("id");
    let submitting = false;

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
      return field ? String(field.value ?? "").trim() : "";
    }

    function setValue(name, value) {
      const field = getField(name);

      if (field) {
        field.value = value == null ? "" : String(value);
      }
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

    function validateForm() {
      if (!form.reportValidity()) {
        return false;
      }

      const title = getValue("title");
      const locationValue = getValue("location");
      const summary = getValue("summary");
      const description = getValue("description");

      if (!title || !locationValue || !summary || !description) {
        showMessage(
          "Please complete the required vacancy fields.",
          "error"
        );
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
          "Please enter a valid application email address.",
          "error"
        );
        emailField.focus();
        return false;
      }

      const closingDate = getValue("closing_date");

      if (closingDate) {
        const dateField = getField("closing_date");

        if (dateField && dateField.type === "date") {
          const today = new Date();
          const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
          ].join("-");

          if (closingDate < todayString) {
            showMessage(
              "The closing date cannot be in the past.",
              "error"
            );
            dateField.focus();
            return false;
          }
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
        status: getValue("status")
      };

      /*
       * Only include closing_date if the HTML form has that field.
       * The backend schema must also support closing_date.
       */
      if (getField("closing_date")) {
        payload.closing_date = getValue("closing_date") || null;
      }

      return payload;
    }

    async function loadVacancy(id) {
      if (formTitle) {
        formTitle.textContent = "Edit vacancy";
      }

      showMessage("Loading vacancy…");

      const response = await admin.api("/api/admin/jobs");
      const jobs = normaliseJobs(response);

      const job = jobs.find(
        (item) => String(item.id) === String(id)
      );

      if (!job) {
        throw new Error(
          "Vacancy not found in the jobs returned by the API."
        );
      }

      [
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
      ].forEach((key) => setValue(key, job[key]));

      showMessage(`Editing vacancy #${job.id}.`, "success");
    }

    if (jobId) {
      saveButton.disabled = true;

      try {
        await loadVacancy(jobId);
      } catch (error) {
        console.error("AVERRA vacancy loading error:", error);

        showMessage(
          `Unable to load vacancy: ${error.message}`,
          "error"
        );

        saveButton.disabled = true;
        return;
      }

      saveButton.disabled = false;
    } else {
      if (formTitle) {
        formTitle.textContent = "Create vacancy";
      }

      showMessage("Complete the details below to create a vacancy.");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (submitting || !validateForm()) {
        return;
      }

      submitting = true;
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
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

        showMessage("Vacancy saved successfully.", "success");
        saveButton.textContent = "Saved";

        location.href = "jobs.html";
      } catch (error) {
        console.error("AVERRA vacancy saving error:", error);

        showMessage(
          `Could not save vacancy: ${error.message}`,
          "error"
        );

        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        submitting = false;
      }
    });
  });
})();
