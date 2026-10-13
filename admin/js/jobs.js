(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;
    if (!admin || !admin.requireLogin()) return;

    document.getElementById("logout-button")
      ?.addEventListener("click", () => admin.logout());

    const table = document.getElementById("jobs-table");
    const message = document.getElementById("jobs-message");

    function makeButton(label, className, action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `btn ${className}`;
      button.textContent = label;
      button.addEventListener("click", action);
      return button;
    }

    async function changeStatus(job, newStatus) {
      const verb = newStatus === "published" ? "publish" : "close";
      if (!confirm(`Are you sure you want to ${verb} "${job.title}"?`)) {
        return;
      }

      try {
        await admin.api(`/api/admin/jobs/${job.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus })
        });

        message.textContent = `Vacancy ${verb}ed successfully.`;
        message.className = "message success";
        await loadJobs();
      } catch (error) {
        message.textContent = error.message;
        message.className = "message error";
      }
    }

    function renderJobs(jobs) {
      table.replaceChildren();

      if (!jobs.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = "No vacancies found. Add your first job.";
        row.appendChild(cell);
        table.appendChild(row);
        return;
      }

      jobs.forEach(job => {
        const row = document.createElement("tr");

        const title = document.createElement("td");
        title.textContent = job.title || "Untitled";

        const location = document.createElement("td");
        location.textContent = job.location || "Not specified";

        const employment = document.createElement("td");
        employment.textContent = job.employment_type || "Not specified";

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `status ${job.status || "draft"}`;
        badge.textContent = job.status || "draft";
        statusCell.appendChild(badge);

        const actions = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "actions";

        actionGroup.appendChild(makeButton("Edit", "btn-secondary", () => {
          location.href = `job-form.html?id=${encodeURIComponent(job.id)}`;
        }));

        if (job.status !== "published") {
          actionGroup.appendChild(makeButton(
            "Publish", "btn-primary",
            () => changeStatus(job, "published")
          ));
        }

        if (job.status !== "closed") {
          actionGroup.appendChild(makeButton(
            "Close", "btn-danger",
            () => changeStatus(job, "closed")
          ));
        }

        actions.appendChild(actionGroup);
        row.append(title, location, employment, statusCell, actions);
        table.appendChild(row);
      });
    }

    async function loadJobs() {
      message.textContent = "Loading vacancies…";
      message.className = "message";

      try {
        const jobs = await admin.api("/api/admin/jobs");
        renderJobs(jobs);
        message.textContent = `${jobs.length} vacancy/vacancies loaded.`;
        message.className = "message success";
      } catch (error) {
        message.textContent = `Unable to load jobs: ${error.message}`;
        message.className = "message error";
        table.replaceChildren();
      }
    }

    await loadJobs();
  });
})();