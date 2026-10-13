(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const admin = window.AVERRA_ADMIN;
    if (!admin || !admin.requireLogin()) return;

    document.getElementById("logout-button")
      ?.addEventListener("click", () => admin.logout());

    const message = document.getElementById("dashboard-message");
    const recentJobs = document.getElementById("recent-jobs");

    try {
      const jobs = await admin.api("/api/admin/jobs");

      const published = jobs.filter(job => job.status === "published").length;
      const drafts = jobs.filter(job => job.status === "draft").length;

      document.getElementById("total-jobs").textContent = jobs.length;
      document.getElementById("published-jobs").textContent = published;
      document.getElementById("draft-jobs").textContent = drafts;

      recentJobs.replaceChildren();

      if (jobs.length === 0) {
        recentJobs.innerHTML =
          '<tr><td colspan="3">No vacancies yet. Add your first job.</td></tr>';
      } else {
        jobs.slice(0, 5).forEach(job => {
          const row = document.createElement("tr");

          const titleCell = document.createElement("td");
          titleCell.textContent = job.title || "Untitled";

          const locationCell = document.createElement("td");
          locationCell.textContent = job.location || "Not specified";

          const statusCell = document.createElement("td");
          const badge = document.createElement("span");
          badge.className = `status ${job.status || "draft"}`;
          badge.textContent = job.status || "draft";
          statusCell.appendChild(badge);

          row.append(titleCell, locationCell, statusCell);
          recentJobs.appendChild(row);
        });
      }

      message.textContent = "Dashboard loaded successfully.";
      message.classList.add("success");
    } catch (error) {
      message.textContent = `Unable to load dashboard: ${error.message}`;
      message.classList.add("error");
      recentJobs.innerHTML =
        '<tr><td colspan="3">Could not load vacancies.</td></tr>';
    }
  });
})();