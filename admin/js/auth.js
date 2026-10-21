
(() => {
  "use strict";

  /*
   * AVERRA STAFFING SOLUTIONS LTD
   * Administrator authentication and API client
   * Version 3.0.0
   *
   * Authentication is verified by the FastAPI backend.
   * The browser must never be treated as the security boundary.
   */

  const TOKEN_KEY = "averra_admin_token";

  function getApiBase() {
    const configuredBase =
      window.AVERRA_ADMIN_CONFIG?.API_BASE_URL ||
      window.AVERRA_API_BASE_URL;

    if (typeof configuredBase === "string" && configuredBase.trim()) {
      return configuredBase.trim().replace(/\/+$/, "");
    }

    const hostname = window.location.hostname;

    // Local PyCharm development server.
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return "http://127.0.0.1:8000";
    }

    // Production: assumes the API is served from the same origin.
    return window.location.origin;
  }

  const API_BASE = getApiBase();

  function getLoginUrl() {
    const pathname = window.location.pathname;
    const adminIndex = pathname.indexOf("/admin/");

    if (adminIndex !== -1) {
      return `${pathname.slice(0, adminIndex)}/admin/index.html`;
    }

    if (pathname.endsWith("/admin")) {
      return `${pathname}/index.html`;
    }

    return new URL("index.html", window.location.href).href;
  }

  function isLoginPage() {
    const pathname = window.location.pathname.replace(/\/+$/, "");

    return (
      pathname.endsWith("/admin") ||
      pathname.endsWith("/admin/index.html") ||
      pathname === "/index.html"
    );
  }

  function formatApiError(data, statusCode) {
    const detail = data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((error) => {
          const field = Array.isArray(error.loc)
            ? error.loc
                .filter((part) => part !== "body")
                .join(".")
            : "Request";

          return `${field || "Request"}: ${
            error.msg || "Invalid value"
          }`;
        })
        .join("; ");
    }

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    const messages = {
      400: "The request could not be processed. Check the information and try again.",
      401: "Your administrator token is invalid or your session has expired. Please sign in again.",
      403: "Access denied. You do not have permission to perform this action.",
      404: "The requested API endpoint was not found. Check the backend route.",
      409: "This action conflicts with the current record. Refresh and try again.",
      422: "Some submitted information is invalid. Check the form and try again.",
      429: "Too many requests. Please wait a moment and try again.",
      500: "The server encountered an error. Please try again later.",
      502: "The API server is temporarily unavailable.",
      503: "The API service is unavailable. Please try again later."
    };

    return messages[statusCode] ||
      `Request failed (${statusCode}). Please try again.`;
  }

  function readToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error("AVERRA session storage is unavailable.", error);
      return null;
    }
  }

  function saveToken(token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error("AVERRA could not save the session token.", error);
      return false;
    }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error("AVERRA could not clear the session token.", error);
    }
  }

  function redirectToLogin() {
    if (!isLoginPage()) {
      window.location.replace(getLoginUrl());
    }
  }

  const AVERRA_ADMIN = {
    API_BASE,
    TOKEN_KEY,

    getToken() {
      return readToken();
    },

    isAuthenticated() {
      return Boolean(readToken());
    },

    async api(path, options = {}) {
      if (
        typeof path !== "string" ||
        !path.startsWith("/") ||
        path.startsWith("//")
      ) {
        throw new Error("Invalid API path.");
      }

      const headers = new Headers(options.headers || {});
      const token = readToken();

      headers.set("Accept", "application/json");

      if (token) {
        headers.set("X-Admin-Token", token);
      }

      const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

      if (
        options.body !== undefined &&
        options.body !== null &&
        !isFormData &&
        !headers.has("Content-Type")
      ) {
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
          "Cannot connect to the AVERRA API. Check that the backend is running, the API address is correct, and CORS is configured."
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
        clearToken();

        if (!isLoginPage()) {
          redirectToLogin();
        }

        throw new Error(
          "Your administrator token is invalid or your session has expired. Please sign in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          formatApiError(data, response.status)
        );
      }

      if (!response.ok) {
        console.error("AVERRA API request failed:", {
          path,
          status: response.status,
          response: data
        });

        throw new Error(
          formatApiError(data, response.status)
        );
      }

      return data;
    },

    requireLogin() {
      if (!readToken()) {
        redirectToLogin();
        return false;
      }

      return true;
    },

    async verifyLogin(token) {
      if (typeof token !== "string" || !token.trim()) {
        throw new Error("Please enter your administrator token.");
      }

      // Validate the token against the backend, not in browser code.
      const response = await fetch(`${API_BASE}/api/admin/jobs`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Admin-Token": token.trim()
        }
      });

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
        throw new Error("Invalid administrator token.");
      }

      if (response.status === 403) {
        throw new Error("Access denied. Check administrator permissions.");
      }

      if (!response.ok) {
        console.error("AVERRA login verification failed:", {
          status: response.status,
          response: data
        });

        throw new Error(
          formatApiError(data, response.status)
        );
      }

      return true;
    },

    logout() {
      clearToken();
      window.location.replace(getLoginUrl());
    }
  };

  window.AVERRA_ADMIN = AVERRA_ADMIN;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
      return;
    }

    const input = document.getElementById("admin-token");
    const message = document.getElementById("login-message");
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (!input || !message || !submitButton) {
      console.error(
        "AVERRA login page is missing a required element."
      );
      return;
    }

    function showMessage(text, type) {
      message.textContent = text;
      message.className = `message ${type}`;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      message.textContent = "";
      message.className = "message";

      const token = input.value.trim();

      if (!token) {
        showMessage(
          "Please enter your administrator token.",
          "error"
        );
        input.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Verifying…";
      input.disabled = true;

      clearToken();

      try {
        await AVERRA_ADMIN.verifyLogin(token);

        if (!saveToken(token)) {
          throw new Error(
            "Your browser could not create a session. Check your browser settings and try again."
          );
        }

        showMessage(
          "Sign-in successful. Opening dashboard…",
          "success"
        );

        window.location.assign(
          new URL("dashboard.html", window.location.href).href
        );
      } catch (error) {
        clearToken();

        showMessage(
          error.message || "Sign-in failed. Please try again.",
          "error"
        );

        input.disabled = false;
        input.value = "";
        input.focus();
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Sign in securely";
      }
    });
  });
})();
