(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;
    if (!admin || !admin.requireLogin()) return;

    document.getElementById("logout-button")
      ?.addEventListener("click", () => admin.logout());

    const form = document.getElementById("job-form");
    const message = document.getElementById("form-message");
    const saveButton = document.getElementById("save-button");
    const jobId = new URLSearchParams(location.search).get("id");

    if (jobId && !/^\d+$/.test(jobId)) {
      message.textContent = "Invalid vacancy ID.";
      message.className = "message error";
      saveButton.disabled = true;
      return;
    }

    function setValue(name, value) {
      const field = form.elements.namedItem(name);
      if (field) field.value = value ?? "";
    }

    if (jobId) {
      document.getElementById("form-title").textContent = "Edit vacancy";

      try {
        const jobs = await admin.api("/api/admin/jobs");
        const job = jobs.find(item => String(item.id) === jobId);

        if (!job) {
          throw new Error("Vacancy not found.");
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
          "status"
        ].forEach(key => setValue(key, job[key]));

        message.textContent = `Editing vacancy #${job.id}.`;
        message.className = "message success";
      } catch (error) {
        message.textContent = `Unable to load vacancy: ${error.message}`;
        message.className = "message error";
        saveButton.disabled = true;
        return;
      }
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      message.textContent = "";
      message.className = "message";
      saveButton.disabled = true;

      const payload = {
        title: form.elements.title.value.trim(),
        department: form.elements.department.value.trim() || null,
        location: form.elements.location.value.trim(),
        employment_type: form.elements.employment_type.value,
        salary_range: form.elements.salary_range.value.trim() || null,
        summary: form.elements.summary.value.trim(),
        description: form.elements.description.value.trim(),
        application_email:
          form.elements.application_email.value.trim() || null,
        status: form.elements.status.value
      };

      try {
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

        message.textContent = "Vacancy saved successfully.";
        message.className = "message success";
        saveButton.textContent = "Saved";

        setTimeout(() => {
          location.href = "jobs.html";
        }, 700);
      } catch (error) {
        message.textContent = `Could not save vacancy: ${error.message}`;
        message.className = "message error";
        saveButton.disabled = false;
      }
    });
  });
})();