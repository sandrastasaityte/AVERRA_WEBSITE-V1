
(() => {
  "use strict";

  /*
   * AVERRA STAFFING SOLUTIONS LTD
   * Administrator authentication and API client
   * Version 2.0
   */

  const API_BASE = "http://127.0.0.1:8000";
  const TOKEN_KEY = "averra_admin_token";

  function formatApiError(data, statusCode) {
    const detail = data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((error) => {
        const field = Array.isArray(error.loc)
          ? error.loc
              .filter((part) => part !== "body")
              .join(".")
          : "Request";

        const reason = error.msg || "Invalid value";

        const receivedValue =
          Object.prototype.hasOwnProperty.call(error, "input")
            ? ` (received: ${JSON.stringify(error.input)})`
            : "";

        return `${field || "Request"}: ${reason}${receivedValue}`;
      }).join("; ");
    }

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    return `Request failed (${statusCode}). Please check the request and try again.`;
  }

  const AVERRA_ADMIN = {
    API_BASE,
    TOKEN_KEY,

    getToken() {
      return sessionStorage.getItem(TOKEN_KEY);
    },

    async api(path, options = {}) {
      const headers = new Headers(options.headers || {});
      const token = this.getToken();

      headers.set("Accept", "application/json");

      if (token) {
        headers.set("X-Admin-Token", token);
      }

      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      let response;

      try {
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers
        });
      } catch (error) {
        console.error("AVERRA API connection error:", error);

        throw new Error(
          "Cannot connect to the AVERRA API. Check that the backend is running and the API address is correct."
        );
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

      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);

        const pathName = window.location.pathname;

        const isLoginPage =
          pathName.endsWith("/index.html") ||
          pathName.endsWith("/admin/") ||
          pathName.endsWith("/admin");

        if (!isLoginPage) {
          window.location.href = "index.html";
        }

        throw new Error(
          "Your administrator token is invalid or your session has expired. Please sign in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "Access denied. Check your administrator permissions."
        );
      }

      if (!response.ok) {
    console.error(
        "AVERRA API validation response:",
        JSON.stringify(data, null, 2)
    );

    const message = formatApiError(data, response.status);
    throw new Error(message);
}

      return data;
    },

    requireLogin() {
      if (!this.getToken()) {
        window.location.href = "index.html";
        return false;
      }

      return true;
    },

    logout() {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = "index.html";
    }
  };

  window.AVERRA_ADMIN = AVERRA_ADMIN;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) return;

    const input = document.getElementById("admin-token");
    const message = document.getElementById("login-message");
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (!input || !message || !submitButton) {
      console.error(
        "AVERRA login form is missing a required element."
      );
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      message.textContent = "";
      message.className = "message";

      const token = input.value.trim();

      if (!token) {
        message.textContent =
          "Please enter your administrator token.";
        message.classList.add("error");
        input.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Signing in…";

      sessionStorage.setItem(TOKEN_KEY, token);

      try {
        await AVERRA_ADMIN.api("/api/admin/jobs");

        message.textContent =
          "Sign-in successful. Opening dashboard…";
        message.classList.add("success");

        window.location.href = "dashboard.html";
      } catch (error) {
        sessionStorage.removeItem(TOKEN_KEY);

        message.textContent =
          error.message || "Sign-in failed. Please try again.";

        message.classList.add("error");
        input.focus();
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Sign in securely";
      }
    });
  });
})();
