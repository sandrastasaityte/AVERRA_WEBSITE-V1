
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/auth.js
   Version: 3.8.0

   Administrator authentication and API client.
   Backend: FastAPI on Render.

   FEATURES
   - Session-scoped administrator token storage
   - Backend token verification before login
   - API requests with X-Admin-Token
   - Login, logout and protected-page verification
   - Enquiry, application and job deletion
   - Clear authentication configuration errors
   - Request timeouts and connection error handling
   - JSON and non-JSON response handling
   - Compatible with existing AVERRA admin pages

   SECURITY
   - Never hard-code the administrator token here.
   - Configure AVERRA_ADMIN_TOKEN on the backend.
   - Never store the token in localStorage.
   ============================================================ */

(function () {
    const VERSION = "3.8.0";
    const TOKEN_KEY = "averra_admin_token";
    const DEFAULT_TIMEOUT = 20000;

    const DEFAULT_API_BASE =
        "https://averra-backend-dn23.onrender.com";

    if (
        window.AVERRA_ADMIN &&
        window.AVERRA_ADMIN.__authVersion === VERSION
    ) {
        return;
    }

    const config = window.AVERRA_ADMIN_CONFIG || {};

    const API_BASE = String(
        config.API_BASE_URL ||
        window.AVERRA_API_BASE_URL ||
        DEFAULT_API_BASE
    ).trim().replace(/\/+$/, "");

    let loginRedirecting = false;

    /* ============================================================
       TOKEN MANAGEMENT
       ============================================================ */

    function getToken() {
        try {
            return sessionStorage.getItem(TOKEN_KEY) || "";
        } catch (error) {
            console.error(
                "AVERRA: Could not read the login session.",
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
                "The browser could not save your login session. " +
                "Check your browser privacy settings."
            );
        }
    }

    function clearToken() {
        try {
            sessionStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error(
                "AVERRA: Could not clear the login session.",
                error
            );
        }
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    /* ============================================================
       PAGE HELPERS
       ============================================================ */

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
        const path = window.location.pathname;
        const lowerPath = path.toLowerCase();
        const adminIndex = lowerPath.lastIndexOf("/admin/");

        if (adminIndex !== -1) {
            return (
                path.substring(0, adminIndex) +
                "/admin/dashboard.html"
            );
        }

        if (/\/admin$/i.test(path)) {
            return path + "/dashboard.html";
        }

        return new URL(
            "dashboard.html",
            window.location.href
        ).href;
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
            const message = detail.trim();

            if (
                status === 503 &&
                /administrator authentication is not configured/i
                    .test(message)
            ) {
                return (
                    "Administrator authentication is not configured " +
                    "on the backend. In Render, open the AVERRA backend " +
                    "service, go to Environment, add AVERRA_ADMIN_TOKEN " +
                    "with a secure secret value, and deploy the changes."
                );
            }

            return message;
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
                "The administrator token is invalid or the session " +
                "has expired. Please sign in again.",

            403:
                "Administrator access was denied. Check your " +
                "permissions and backend authentication settings.",

            404:
                "The requested API endpoint or record was not found. " +
                "Check the backend routes and API URL.",

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
                "The AVERRA backend returned HTTP 503. Check the " +
                "backend configuration and Render logs."
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
                    "The request timed out. The Render backend may " +
                    "be starting or unavailable. Please try again."
                );
            }

            console.error(
                "AVERRA: Network request failed.",
                error
            );

            throw new Error(
                "Could not connect to the AVERRA backend. Check the " +
                "Render service, API URL and backend CORS settings."
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
            throw new Error("A valid API path is required.");
        }

        const settings = Object.assign({}, options || {});

        const timeout = Number(settings.timeout) > 0
            ? Number(settings.timeout)
            : DEFAULT_TIMEOUT;

        delete settings.timeout;

        const endpoint = /^https?:\/\//i.test(path)
            ? path
            : API_BASE +
                (path.startsWith("/") ? path : "/" + path);

        const headers = new Headers(settings.headers || {});

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

        const response = await request(
            endpoint,
            settings,
            timeout
        );

        const result = await readResponse(response);

        if (!response.ok) {
            const detail = getResponseDetail(result);

            const message = formatApiError(
                response.status,
                detail,
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
            const message = formatApiError(
                response.status,
                getResponseDetail(result),
                "Unable to verify the administrator token."
            );

            console.error(
                "AVERRA: Administrator verification failed.",
                {
                    status: response.status,
                    response: result
                }
            );

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
                "AVERRA: Session verification failed.",
                error
            );

            const message = String(
                error && error.message || ""
            );

            const temporaryFailure =
                /HTTP 5\d\d|authentication.*not configured|administrator authentication|backend.*unavailable|could not connect|timed out|CORS|too many requests|temporarily unavailable|internal error/i
                    .test(message);

            /*
             * Keep the token during temporary server failures.
             * A server problem does not prove the token is invalid.
             */
            if (temporaryFailure) {
                throw error;
            }

            /*
             * An invalid or unauthorized token requires
             * a fresh login.
             */
            clearToken();
            redirectToLogin();

            return false;
        }
    }

    /* ============================================================
       LOGIN MESSAGES
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
                "AVERRA: Login form found, but the token input " +
                "field is missing."
            );

            return;
        }

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

                    if (submitButton.tagName === "INPUT") {
                        submitButton.value = "Signing in...";
                    } else {
                        submitButton.textContent = "Signing in...";
                    }
                }

                try {
                    await verifyLogin(token);

                    /*
                     * Save only after the backend verifies
                     * the submitted token successfully.
                     */
                    saveToken(token);

                    showLoginMessage(
                        "Login successful. Opening dashboard...",
                        false
                    );

                    window.location.assign(getDashboardUrl());
                } catch (error) {
                    /*
                     * Do not leave an unverified token saved.
                     */
                    clearToken();

                    console.error(
                        "AVERRA: Login failed.",
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

                        if (submitButton.tagName === "INPUT") {
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
        window.location.assign(getLoginUrl());
    }

    function bindLogoutButtons() {
        const buttons = document.querySelectorAll(
            "#logout-button, [data-admin-logout]"
        );

        buttons.forEach(function (button) {
            if (button.dataset.averraLogoutBound === "true") {
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
    }

    /* ============================================================
       ADMINISTRATOR DELETE OPERATIONS
       ============================================================ */

    async function deleteEnquiry(id) {
        if (id === undefined || id === null || id === "") {
            throw new Error("An enquiry ID is required.");
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
        if (id === undefined || id === null || id === "") {
            throw new Error("An application ID is required.");
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
        if (id === undefined || id === null || id === "") {
            throw new Error("A vacancy ID is required.");
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
