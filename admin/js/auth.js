(() => {
  "use strict";

  const API_BASE = "http://127.0.0.1:8000";
  const TOKEN_KEY = "averra_admin_token";

  window.AVERRA_ADMIN = {
    API_BASE,
    TOKEN_KEY,

    getToken() {
      return sessionStorage.getItem(TOKEN_KEY);
    },

    async api(path, options = {}) {
      const token = this.getToken();

      const headers = new Headers(options.headers || {});
      headers.set("Accept", "application/json");

      if (token) {
        headers.set("X-Admin-Token", token);
      }

      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        if (!location.pathname.endsWith("/index.html") &&
            !location.pathname.endsWith("/admin/")) {
          location.href = "index.html";
        }
      }

      const raw = await response.text();
      let data = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { detail: raw };
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || `Request failed (${response.status})`
        );
      }

      return data;
    },

    requireLogin() {
      if (!this.getToken()) {
        location.href = "index.html";
        return false;
      }
      return true;
    },

    logout() {
      sessionStorage.removeItem(TOKEN_KEY);
      location.href = "index.html";
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

    const input = document.getElementById("admin-token");
    const message = document.getElementById("login-message");
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "";
      message.className = "message";
      submitButton.disabled = true;

      const token = input.value.trim();

      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        await window.AVERRA_ADMIN.api("/api/admin/jobs");

        message.textContent = "Login successful. Opening dashboard…";
        message.classList.add("success");
        location.href = "dashboard.html";
      } catch (error) {
        sessionStorage.removeItem(TOKEN_KEY);
        message.textContent = error.message;
        message.classList.add("error");
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})();