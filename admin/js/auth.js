
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/auth.js
   Version: 3.6.0

   Admin authentication and API client.
   Backend: FastAPI on Render.
   ============================================================ */

(function () {
    if (
        window.AVERRA_ADMIN &&
        window.AVERRA_ADMIN.__authVersion === "3.6.0"
    ) {
        return;
    }

    const TOKEN_KEY = "averra_admin_token";
    const DEFAULT_API_BASE =
        "https://averra-backend-dn23.onrender.com";

    const config = window.AVERRA_ADMIN_CONFIG || {};

    const API_BASE = String(
        config.API_BASE_URL ||
        window.AVERRA_API_BASE_URL ||
        DEFAULT_API_BASE
    ).trim().replace(/\/+$/, "");

    let loginRedirecting = false;

    function getToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY) || "";
        } catch (error) {
            console.error("AVERRA: Unable to read the login session.", error);
            return "";
        }
    }

    function saveToken(token) {
        const value = String(token || "").trim();

        if (!value) {
            throw new Error("Please enter your administrator token.");
        }

        try {
            sessionStorage.setItem(TOKEN_KEY, value);
        } catch (error) {
            throw new Error(
                "Your browser could not save the login session."
            );
        }
    }

    function clearToken() {
        try {
            sessionStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error("AVERRA: Unable to clear the login session.", error);
        }
    }

    function getLoginUrl() {
        const path = window.location.pathname;
        const adminIndex = path.toLowerCase().lastIndexOf("/admin/");

        if (adminIndex !== -1) {
            return path.substring(0, adminIndex) + "/admin/index.html";
        }

        if (/\/admin$/i.test(path)) {
            return path + "/index.html";
        }

        return new URL("index.html", window.location.href).href;
    }

    function isLoginPage() {
        const path = window.location.pathname.toLowerCase();

        return (
            /\/admin\/?$/.test(path) ||
            /\/admin\/index\.html$/.test(path) ||
            document.documentElement.dataset.page === "admin-login" ||
            Boolean(
                document.querySelector(
                    "#login-form, #admin-login-form, [data-admin-login-form]"
                )
            )
        );
    }

    function redirectToLogin() {
        if (loginRedirecting || isLoginPage()) {
            return;
        }

        loginRedirecting = true;
        window.location.assign(getLoginUrl());
    }

    function formatApiError(status, detail, fallback) {
        if (typeof detail === "string" && detail.trim()) {
            return detail;
        }

        if (Array.isArray(detail)) {
            return detail.map(function (item) {
                if (typeof item === "string") {
                    return item;
                }

                const field = Array.isArray(item.loc)
                    ? item.loc.filter(function (part) {
                        return part !== "body";
                    }).join(".")
                    : "";

                return (field ? field + ": " : "") +
                    (item.msg || JSON.stringify(item));
            }).join("; ");
        }

        if (detail && typeof detail === "object") {
            if (detail.detail !== undefined) {
                return formatApiError(status, detail.detail, fallback);
            }

            if (detail.message) {
                return detail.message;
            }
        }

        const messages = {
            400: "The request could not be processed. Check the submitted information.",
            401: "The administrator token is invalid or the session has expired.",
            403: "You do not have permission to perform this action.",
            404: "The requested record or API endpoint was not found.",
            409: "This action conflicts with the current record.",
            422: "Some submitted information is invalid. Check the form fields.",
            429: "Too many requests. Please wait and try again.",
            500: "The server encountered an error. Please try again later.",
            502: "The API server is temporarily unavailable.",
            503: "Administrator authentication may not be configured on the backend. Check the Render service settings."
        };

        return messages[status] ||
            fallback ||
            "The request failed (HTTP " + status + ").";
    }

    async function request(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, timeout || 20000);

        try {
            return await fetch(url, Object.assign({}, options || {}, {
                signal: controller.signal,
                credentials: "omit",
                cache: "no-store"
            }));
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "The request timed out. Please try again."
                );
            }

            throw new Error(
                "Could not connect to the AVERRA backend. Check the Render service and CORS settings."
            );
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    async function readResponse(response) {
        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";

        try {
            if (contentType.includes("application/json")) {
                return await response.json();
            }

            const body = await response.text();
            return body ? { detail: body } : null;
        } catch (error) {
            return null;
        }
    }

    async function api(path, options) {
        if (typeof path !== "string" || !path.trim()) {
            throw new Error("A valid API path is required.");
        }

        const settings = Object.assign({}, options || {});
        const timeout = Number(settings.timeout) > 0
            ? Number(settings.timeout)
            : 20000;

        delete settings.timeout;

        const endpoint = /^https?:\/\//i.test(path)
            ? path
            : API_BASE + (path.startsWith("/") ? path : "/" + path);

        const headers = new Headers(settings.headers || {});
        const token = getToken();

        headers.set("Accept", "application/json");

        if (token && !headers.has("X-Admin-Token")) {
            headers.set("X-Admin-Token", token);
        }

        if (
            settings.body &&
            typeof settings.body === "string" &&
            !headers.has("Content-Type")
        ) {
            headers.set("Content-Type", "application/json");
        }

        settings.headers = headers;

        let response;

        try {
            response = await request(endpoint, settings, timeout);
        } catch (error) {
            console.error("AVERRA API connection error:", error);
            throw error;
        }

        const result = await readResponse(response);

        if (!response.ok) {
            const detail = result && (
                result.detail !== undefined
                    ? result.detail
                    : result.message
            );

            const message = formatApiError(
                response.status,
                detail,
                "The server returned an error."
            );

            if (response.status === 401 && !isLoginPage()) {
                clearToken();
                redirectToLogin();
            }

            throw new Error(message);
        }

        return result;
    }

    async function verifyLogin(candidateToken) {
        const token = String(candidateToken || "").trim();

        if (!token) {
            throw new Error("Please enter your administrator token.");
        }

        let response;

        try {
            response = await request(
                API_BASE + "/api/admin/jobs",
                {
                    method: "GET",
                    headers: {
                        "X-Admin-Token": token,
                        "Accept": "application/json"
                    }
                },
                20000
            );
        } catch (error) {
            throw error;
        }

        const result = await readResponse(response);

        if (response.status === 401) {
            throw new Error("The administrator token is incorrect.");
        }

        if (!response.ok) {
            const detail = result && (
                result.detail !== undefined
                    ? result.detail
                    : result.message
            );

            throw new Error(
                formatApiError(
                    response.status,
                    detail,
                    "Unable to verify the administrator token."
                )
            );
        }

        return true;
    }

    async function requireLogin() {
        if (isLoginPage()) {
            return false;
        }

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return false;
        }

        try {
            await verifyLogin(token);
            return true;
        } catch (error) {
            console.error("AVERRA session verification failed:", error);

            if (
                /authentication.*not configured|administrator authentication|AVERRA backend|timed out|temporarily unavailable|server encountered an error|too many requests/i.test(
                    error.message || ""
                )
            ) {
                throw error;
            }

            clearToken();
            redirectToLogin();
            return false;
        }
    }

    function showLoginMessage(message, isError) {
        const element = document.querySelector(
            "#login-message, #form-message, #error-message, [data-login-message]"
        );

        if (!element) {
            window.alert(message);
            return;
        }

        element.textContent = message;
        element.hidden = false;
        element.setAttribute("role", "alert");
        element.classList.toggle("error", Boolean(isError));
        element.classList.toggle("success", !isError);
    }

    function findTokenInput(form) {
        return (
            form.querySelector(
                'input[name="token"], input[name="admin_token"], ' +
                'input[name="adminToken"], input[name="password"], ' +
                '#admin-token, #admin_token, #token, #password, ' +
                'input[data-admin-token]'
            ) ||
            document.querySelector(
                'input[name="token"], input[name="admin_token"], ' +
                'input[name="adminToken"], input[name="password"], ' +
                '#admin-token, #admin_token, #token, #password, ' +
                'input[data-admin-token]'
            )
        );
    }

    function initialiseLoginForm() {
        const form = document.querySelector(
            "#login-form, #admin-login-form, [data-admin-login-form]"
        );

        if (!form || form.dataset.averraAuthBound === "true") {
            return;
        }

        const tokenInput = findTokenInput(form);

        if (!tokenInput) {
            console.error(
                "AVERRA: Login form found, but its token input is missing."
            );
            return;
        }

        form.dataset.averraAuthBound = "true";

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const token = tokenInput.value.trim();

            if (!token) {
                showLoginMessage(
                    "Please enter your administrator token.",
                    true
                );
                tokenInput.focus();
                return;
            }

            const submitButton = form.querySelector(
                'button[type="submit"], input[type="submit"], #login-button'
            );

            const originalText = submitButton
                ? (
                    submitButton.tagName === "INPUT"
                        ? submitButton.value
                        : submitButton.textContent
                )
                : "";

            if (submitButton) {
                submitButton.disabled = true;

                if (submitButton.tagName === "INPUT") {
                    submitButton.value = "Signing in...";
                } else {
                    submitButton.textContent = "Signing in...";
                }
            }

            try {
                await verifyLogin(token);
                saveToken(token);

                showLoginMessage(
                    "Login successful. Opening dashboard...",
                    false
                );

                window.location.assign(
                    new URL("dashboard.html", window.location.href).href
                );
            } catch (error) {
                clearToken();
                console.error("AVERRA login failed:", error);

                showLoginMessage(
                    error.message || "Login failed. Please try again.",
                    true
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;

                    if (submitButton.tagName === "INPUT") {
                        submitButton.value = originalText || "Log in";
                    } else {
                        submitButton.textContent = originalText || "Log in";
                    }
                }
            }
        });
    }

    function logout() {
        clearToken();
        window.location.assign(getLoginUrl());
    }

    async function deleteEnquiry(id) {
        if (id === undefined || id === null || id === "") {
            throw new Error("An enquiry ID is required.");
        }

        return api(
            "/api/admin/enquiries/" + encodeURIComponent(id),
            { method: "DELETE" }
        );
    }

    async function deleteApplication(id) {
        if (id === undefined || id === null || id === "") {
            throw new Error("An application ID is required.");
        }

        return api(
            "/api/admin/applications/" + encodeURIComponent(id),
            { method: "DELETE" }
        );
    }

    async function deleteJob(id) {
        if (id === undefined || id === null || id === "") {
            throw new Error("A vacancy ID is required.");
        }

        return api(
            "/api/admin/jobs/" + encodeURIComponent(id),
            { method: "DELETE" }
        );
    }

    // Publish the API immediately so deferred scripts can access it.
    window.AVERRA_ADMIN = Object.assign(
        window.AVERRA_ADMIN || {},
        {
            __authVersion: "3.6.0",
            API_BASE_URL: API_BASE,
            TOKEN_KEY: TOKEN_KEY,
            getToken: getToken,
            saveToken: saveToken,
            clearToken: clearToken,
            isAuthenticated: function () {
                return Boolean(getToken());
            },
            api: api,
            verifyLogin: verifyLogin,
            requireLogin: requireLogin,
            logout: logout,
            deleteEnquiry: deleteEnquiry,
            deleteApplication: deleteApplication,
            deleteJob: deleteJob
        }
    );

    function bindLogoutButtons() {
        document.querySelectorAll(
            "#logout-button, [data-admin-logout]"
        ).forEach(function (button) {
            if (button.dataset.averraLogoutBound === "true") {
                return;
            }

            button.dataset.averraLogoutBound = "true";

            button.addEventListener("click", function (event) {
                event.preventDefault();
                logout();
            });
        });
    }

    function initialise() {
        initialiseLoginForm();
        bindLogoutButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise);
    } else {
        initialise();
    }
})();
