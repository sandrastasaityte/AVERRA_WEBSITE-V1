
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/auth.js
   Version: 3.7.0

   Administrator authentication and API client.
   Backend: FastAPI on Render.

   FEATURES
   - Secure session-scoped token storage
   - Administrator token verification
   - API requests with X-Admin-Token
   - Login and logout handling
   - Protected-page session verification
   - Enquiry, application and job deletion
   - Clear backend configuration error messages
   - Request timeouts and connection error handling
   - Compatible with existing AVERRA admin pages

   IMPORTANT
   This file cannot configure administrator authentication
   on Render. The backend must have its required administrator
   token environment variable configured.
   ============================================================ */

(function () {
    if (
        window.AVERRA_ADMIN &&
        window.AVERRA_ADMIN.__authVersion === "3.7.0"
    ) {
        return;
    }

    const VERSION = "3.7.0";
    const TOKEN_KEY = "averra_admin_token";

    const DEFAULT_API_BASE =
        "https://averra-backend-dn23.onrender.com";

    const DEFAULT_TIMEOUT = 20000;

    const config = window.AVERRA_ADMIN_CONFIG || {};

    const API_BASE = String(
        config.API_BASE_URL ||
        window.AVERRA_API_BASE_URL ||
        DEFAULT_API_BASE
    ).trim().replace(/\/+$/, "");

    let loginRedirecting = false;
    let loginHandlerBound = false;
    let logoutHandlersBound = false;

    /* ============================================================
       TOKEN MANAGEMENT
       ============================================================ */

    function getToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY) || "";
        } catch (error) {
            console.error(
                "AVERRA: Unable to read the login session.",
                error
            );

            return "";
        }
    }

    function saveToken(token) {
        const value = String(token || "").trim();

        if (!value) {
            throw new Error(
                "Please enter your administrator token."
            );
        }

        try {
            sessionStorage.setItem(TOKEN_KEY, value);
        } catch (error) {
            throw new Error(
                "Your browser could not save the login session. " +
                "Check your browser privacy settings."
            );
        }
    }

    function clearToken() {
        try {
            sessionStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error(
                "AVERRA: Unable to clear the login session.",
                error
            );
        }
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    /* ============================================================
       PAGE AND REDIRECT HELPERS
       ============================================================ */

    function getLoginUrl() {
        const path = window.location.pathname;
        const lowerPath = path.toLowerCase();
        const adminIndex = lowerPath.lastIndexOf("/admin/");

        if (adminIndex !== -1) {
            return (
                path.substring(0, adminIndex) +
                "/admin/index.html"
            );
        }

        if (/\/admin$/i.test(path)) {
            return path + "/index.html";
        }

        return new URL(
            "index.html",
            window.location.href
        ).href;
    }

    function getDashboardUrl() {
        return new URL(
            "dashboard.html",
            window.location.href
        ).href;
    }

    function isLoginPage() {
        const path = window.location.pathname.toLowerCase();

        return (
            /\/admin\/?$/.test(path) ||
            /\/admin\/index\.html$/.test(path) ||
            document.documentElement.dataset.page ===
                "admin-login" ||
            Boolean(
                document.querySelector(
                    "#login-form, " +
                    "#admin-login-form, " +
                    "[data-admin-login-form]"
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

    /* ============================================================
       ERROR HANDLING
       ============================================================ */

    function formatApiError(status, detail, fallback) {
        if (
            typeof detail === "string" &&
            detail.trim()
        ) {
            return detail.trim();
        }

        if (Array.isArray(detail)) {
            return detail.map(function (item) {
                if (typeof item === "string") {
                    return item;
                }

                if (!item || typeof item !== "object") {
                    return String(item);
                }

                const field = Array.isArray(item.loc)
                    ? item.loc.filter(function (part) {
                        return part !== "body";
                    }).join(".")
                    : "";

                return (
                    (field ? field + ": " : "") +
                    (item.msg || JSON.stringify(item))
                );
            }).join("; ");
        }

        if (detail && typeof detail === "object") {
            if (detail.detail !== undefined) {
                return formatApiError(
                    status,
                    detail.detail,
                    fallback
                );
            }

            if (detail.message) {
                return String(detail.message);
            }
        }

        const messages = {
            400:
                "The request could not be processed. " +
                "Check the submitted information.",

            401:
                "The administrator token is invalid or " +
                "the session has expired. Please sign in again.",

            403:
                "You do not have permission to perform this action.",

            404:
                "The requested API endpoint or record was not found. " +
                "Check the backend routes.",

            409:
                "This action conflicts with the current record.",

            422:
                "Some submitted information is invalid. " +
                "Check the form fields.",

            429:
                "Too many requests. Please wait and try again.",

            500:
                "The AVERRA backend encountered an internal error. " +
                "Check the Render logs.",

            502:
                "The AVERRA backend is temporarily unavailable. " +
                "Check the Render service.",

            503:
                "The AVERRA backend returned HTTP 503. " +
                "If the response says administrator authentication " +
                "is not configured, configure the required " +
                "administrator token environment variable in Render " +
                "and restart or redeploy the backend."
        };

        return (
            messages[status] ||
            fallback ||
            "The request failed (HTTP " + status + ")."
        );
    }

    function getResponseDetail(result) {
        if (!result || typeof result !== "object") {
            return result;
        }

        if (result.detail !== undefined) {
            return result.detail;
        }

        if (result.message !== undefined) {
            return result.message;
        }

        return null;
    }

    /* ============================================================
       HTTP REQUEST HELPER
       ============================================================ */

    async function request(url, options, timeout) {
        const controller = new AbortController();

        const timeoutId = window.setTimeout(function () {
            controller.abort();
        }, timeout || DEFAULT_TIMEOUT);

        try {
            return await fetch(
                url,
                Object.assign({}, options || {}, {
                    signal: controller.signal,
                    credentials: "omit",
                    cache: "no-store"
                })
            );
        } catch (error) {
            if (error && error.name === "AbortError") {
                throw new Error(
                    "The request timed out. The Render backend " +
                    "may be starting or unavailable. Please try again."
                );
            }

            throw new Error(
                "Could not connect to the AVERRA backend. " +
                "Check the Render service, API URL and CORS settings."
            );
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    /* ============================================================
       RESPONSE PARSING
       ============================================================ */

    async function readResponse(response) {
        if (response.status === 204) {
            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        try {
            if (
                contentType.includes("application/json") ||
                contentType.includes("+json")
            ) {
                return await response.json();
            }

            const body = await response.text();

            if (!body) {
                return null;
            }

            return {
                detail: body
            };
        } catch (error) {
            return null;
        }
    }

    /* ============================================================
       API CLIENT
       ============================================================ */

    async function api(path, options) {
        if (
            typeof path !== "string" ||
            !path.trim()
        ) {
            throw new Error(
                "A valid API path is required."
            );
        }

        const settings = Object.assign(
            {},
            options || {}
        );

        const timeout = Number(settings.timeout) > 0
            ? Number(settings.timeout)
            : DEFAULT_TIMEOUT;

        delete settings.timeout;

        const endpoint = /^https?:\/\//i.test(path)
            ? path
            : API_BASE +
                (path.startsWith("/") ? path : "/" + path);

        const headers = new Headers(
            settings.headers || {}
        );

        headers.set("Accept", "application/json");

        const token = getToken();

        if (token && !headers.has("X-Admin-Token")) {
            headers.set("X-Admin-Token", token);
        }

        if (
            settings.body !== undefined &&
            settings.body !== null &&
            typeof settings.body === "string" &&
            !headers.has("Content-Type")
        ) {
            headers.set(
                "Content-Type",
                "application/json"
            );
        }

        settings.headers = headers;

        let response;

        try {
            response = await request(
                endpoint,
                settings,
                timeout
            );
        } catch (error) {
            console.error(
                "AVERRA API connection error:",
                error
            );

            throw error;
        }

        const result = await readResponse(response);

        if (!response.ok) {
            const message = formatApiError(
                response.status,
                getResponseDetail(result),
                "The server returned an error."
            );

            if (
                response.status === 401 &&
                !isLoginPage()
            ) {
                clearToken();
                redirectToLogin();
            }

            throw new Error(message);
        }

        return result;
    }

    /* ============================================================
       LOGIN VERIFICATION
       ============================================================ */

    async function verifyLogin(candidateToken) {
        const token = String(
            candidateToken || ""
        ).trim();

        if (!token) {
            throw new Error(
                "Please enter your administrator token."
            );
        }

        const response = await request(
            API_BASE + "/api/admin/jobs",
            {
                method: "GET",
                headers: {
                    "X-Admin-Token": token,
                    "Accept": "application/json"
                }
            },
            DEFAULT_TIMEOUT
        );

        const result = await readResponse(response);

        if (response.status === 401) {
            throw new Error(
                "The administrator token is incorrect. " +
                "Check the token configured in Render."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "The server denied administrator access. " +
                "Check the backend authentication configuration."
            );
        }

        if (!response.ok) {
            const detail = getResponseDetail(result);

            const message = formatApiError(
                response.status,
                detail,
                "Unable to verify the administrator token."
            );

            if (response.status === 503) {
                console.error(
                    "AVERRA authentication configuration error. " +
                    "The backend must be configured before login " +
                    "can succeed. Response:",
                    result
                );
            }

            throw new Error(message);
        }

        return true;
    }

    /* ============================================================
       PROTECTED PAGE CHECK
       ============================================================ */

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
            console.error(
                "AVERRA session verification failed:",
                error
            );

            const message = String(
                error && error.message || ""
            );

            /*
             * Do not repeatedly redirect for server or
             * network failures. These do not prove that
             * the stored token is incorrect.
             */
            const temporaryFailure =
                /HTTP 5\d\d|authentication.*not configured|administrator authentication|backend.*unavailable|could not connect|timed out|CORS|too many requests|temporarily unavailable|internal error/i
                    .test(message);

            if (temporaryFailure) {
                throw error;
            }

            /*
             * Invalid tokens and other definitive
             * authorization failures require a new login.
             */
            clearToken();
            redirectToLogin();

            return false;
        }
    }

    /* ============================================================
       LOGIN FORM MESSAGES
       ============================================================ */

    function showLoginMessage(message, isError) {
        const element = document.querySelector(
            "#login-message, " +
            "#form-message, " +
            "#error-message, " +
            "[data-login-message]"
        );

        if (!element) {
            window.alert(message);
            return;
        }

        element.textContent = message;
        element.hidden = false;
        element.setAttribute(
            "role",
            isError ? "alert" : "status"
        );

        element.classList.toggle(
            "error",
            Boolean(isError)
        );

        element.classList.toggle(
            "success",
            !isError
        );
    }

    function findTokenInput(form) {
        const selectors = [
            'input[name="token"]',
            'input[name="admin_token"]',
            'input[name="adminToken"]',
            'input[name="password"]',
            "#admin-token",
            "#admin_token",
            "#token",
            "#password",
            "input[data-admin-token]"
        ].join(", ");

        return (
            form.querySelector(selectors) ||
            document.querySelector(selectors)
        );
    }

    /* ============================================================
       LOGIN FORM INITIALISATION
       ============================================================ */

    function initialiseLoginForm() {
        if (loginHandlerBound) {
            return;
        }

        const form = document.querySelector(
            "#login-form, " +
            "#admin-login-form, " +
            "[data-admin-login-form]"
        );

        if (
            !form ||
            form.dataset.averraAuthBound === "true"
        ) {
            return;
        }

        const tokenInput = findTokenInput(form);

        if (!tokenInput) {
            console.error(
                "AVERRA: Login form found, but its token " +
                "input is missing."
            );

            return;
        }

        loginHandlerBound = true;
        form.dataset.averraAuthBound = "true";

        form.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const token = String(
                    tokenInput.value || ""
                ).trim();

                if (!token) {
                    showLoginMessage(
                        "Please enter your administrator token.",
                        true
                    );

                    tokenInput.focus();
                    return;
                }

                const submitButton = form.querySelector(
                    'button[type="submit"], ' +
                    'input[type="submit"], ' +
                    "#login-button"
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

                    if (
                        submitButton.tagName === "INPUT"
                    ) {
                        submitButton.value = "Signing in...";
                    } else {
                        submitButton.textContent =
                            "Signing in...";
                    }
                }

                try {
                    await verifyLogin(token);

                    /*
                     * Store the token only after the
                     * backend confirms that it is valid.
                     */
                    saveToken(token);

                    showLoginMessage(
                        "Login successful. Opening dashboard...",
                        false
                    );

                    window.location.assign(
                        getDashboardUrl()
                    );
                } catch (error) {
                    clearToken();

                    console.error(
                        "AVERRA login failed:",
                        error
                    );

                    showLoginMessage(
                        error && error.message
                            ? error.message
                            : "Login failed. Please try again.",
                        true
                    );
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;

                        if (
                            submitButton.tagName === "INPUT"
                        ) {
                            submitButton.value =
                                originalText || "Log in";
                        } else {
                            submitButton.textContent =
                                originalText || "Log in";
                        }
                    }
                }
            }
        );
    }

    /* ============================================================
       LOGOUT
       ============================================================ */

    function logout() {
        clearToken();

        window.location.assign(
            getLoginUrl()
        );
    }

    function bindLogoutButtons() {
        if (logoutHandlersBound) {
            return;
        }

        const buttons = document.querySelectorAll(
            "#logout-button, [data-admin-logout]"
        );

        buttons.forEach(function (button) {
            if (
                button.dataset.averraLogoutBound === "true"
            ) {
                return;
            }

            button.dataset.averraLogoutBound = "true";

            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    logout();
                }
            );
        });

        logoutHandlersBound = true;
    }

    /* ============================================================
       ADMINISTRATOR DELETE OPERATIONS
       ============================================================ */

    async function deleteEnquiry(id) {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            throw new Error(
                "An enquiry ID is required."
            );
        }

        return api(
            "/api/admin/enquiries/" +
                encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );
    }

    async function deleteApplication(id) {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            throw new Error(
                "An application ID is required."
            );
        }

        return api(
            "/api/admin/applications/" +
                encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );
    }

    async function deleteJob(id) {
        if (
            id === undefined ||
            id === null ||
            id === ""
        ) {
            throw new Error(
                "A vacancy ID is required."
            );
        }

        return api(
            "/api/admin/jobs/" +
                encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.AVERRA_ADMIN = Object.assign(
        window.AVERRA_ADMIN || {},
        {
            __authVersion: VERSION,
            API_BASE_URL: API_BASE,
            TOKEN_KEY: TOKEN_KEY,

            getToken: getToken,
            saveToken: saveToken,
            clearToken: clearToken,
            isAuthenticated: isAuthenticated,

            api: api,
            verifyLogin: verifyLogin,
            requireLogin: requireLogin,
            logout: logout,

            deleteEnquiry: deleteEnquiry,
            deleteApplication: deleteApplication,
            deleteJob: deleteJob
        }
    );

    /* ============================================================
       INITIALISATION
       ============================================================ */

    function initialise() {
        initialiseLoginForm();
        bindLogoutButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            { once: true }
        );
    } else {
        initialise();
    }
})();
