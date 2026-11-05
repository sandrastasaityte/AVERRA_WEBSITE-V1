
/**
 * AVERRA STAFFING SOLUTIONS LTD
 * File: admin/js/auth.js
 * Version: 3.9.0
 *
 * Administrator authentication and API communication.
 *
 * Security:
 * - Stores the administrator token in sessionStorage only.
 * - Never stores the token in localStorage.
 * - Sends the token using X-Admin-Token.
 * - Verifies credentials with the backend before login.
 * - Preserves sessions during temporary server/network failures.
 */

(function () {
    "use strict";

    if (window.AVERRA_ADMIN) {
        console.warn("AVERRA_ADMIN has already been initialised.");
        return;
    }

    const CONFIG = Object.freeze({
        API_BASE_URL:
            window.AVERRA_API_BASE_URL ||
            "https://averra-backend-dn23.onrender.com",

        TOKEN_KEY: "averra_admin_token",

        REQUEST_TIMEOUT: 20000,

        LOGIN_VERIFICATION_ENDPOINT: "/api/admin/jobs",

        DASHBOARD_PAGE: "dashboard.html"
    });

    let currentToken = null;

    // --------------------------------------------------------
    // TOKEN MANAGEMENT
    // --------------------------------------------------------

    function getStoredToken() {
        try {
            return sessionStorage.getItem(CONFIG.TOKEN_KEY) || "";
        } catch (error) {
            console.error("Unable to access session storage.", error);
            return "";
        }
    }

    function saveToken(token) {
        if (typeof token !== "string" || !token.trim()) {
            throw new Error("A valid administrator token is required.");
        }

        const cleanToken = token.trim();

        try {
            sessionStorage.setItem(CONFIG.TOKEN_KEY, cleanToken);
            currentToken = cleanToken;
            return true;
        } catch (error) {
            console.error("Unable to save administrator session.", error);
            throw new Error(
                "Your browser could not save the login session."
            );
        }
    }

    function clearToken() {
        currentToken = null;

        try {
            sessionStorage.removeItem(CONFIG.TOKEN_KEY);
        } catch (error) {
            console.error("Unable to clear administrator session.", error);
        }
    }

    function getToken() {
        return currentToken || getStoredToken();
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    // --------------------------------------------------------
    // API ERROR HANDLING
    // --------------------------------------------------------

    async function readResponse(response) {
        const contentType =
            response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            try {
                return await response.json();
            } catch (error) {
                return {};
            }
        }

        const responseText = await response.text();

        return {
            detail:
                responseText ||
                "The server returned an unexpected response."
        };
    }

    function getErrorMessage(data, statusCode) {
        if (data && typeof data.detail === "string") {
            return data.detail;
        }

        if (data && typeof data.message === "string") {
            return data.message;
        }

        if (statusCode === 401) {
            return "Your administrator token is invalid. Please check it and try again.";
        }

        if (statusCode === 403) {
            return "You do not have permission to perform this action.";
        }

        if (statusCode === 404) {
            return "The requested record could not be found.";
        }

        if (statusCode === 422) {
            return "Some submitted information is invalid. Please check the form.";
        }

        if (statusCode >= 500) {
            return "The AVERRA server encountered an error. Please try again.";
        }

        return "The request could not be completed.";
    }

    // --------------------------------------------------------
    // API REQUEST
    // --------------------------------------------------------

    async function api(path, options = {}) {
        if (typeof path !== "string" || !path.startsWith("/")) {
            throw new Error("API path must start with /.");
        }

        const controller = new AbortController();

        const timeout = setTimeout(function () {
            controller.abort();
        }, CONFIG.REQUEST_TIMEOUT);

        const headers = new Headers(options.headers || {});

        headers.set("Accept", "application/json");

        const token = getToken();

        if (token) {
            headers.set("X-Admin-Token", token);
        }

        const requestOptions = {
            ...options,
            headers,
            signal: controller.signal,
            credentials: "omit",
            cache: "no-store"
        };

        if (
            requestOptions.body &&
            typeof requestOptions.body === "string" &&
            !headers.has("Content-Type")
        ) {
            headers.set("Content-Type", "application/json");
        }

        try {
            const response = await fetch(
                CONFIG.API_BASE_URL + path,
                requestOptions
            );

            const data = await readResponse(response);

            if (!response.ok) {
                const error = new Error(
                    getErrorMessage(data, response.status)
                );

                error.status = response.status;
                error.data = data;

                throw error;
            }

            return data;

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "The request timed out. Please check your connection and try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the AVERRA server. Please check your internet connection."
                );
            }

            throw error;

        } finally {
            clearTimeout(timeout);
        }
    }

    // --------------------------------------------------------
    // LOGIN VERIFICATION
    // --------------------------------------------------------

    async function verifyLogin(candidateToken) {
        if (
            typeof candidateToken !== "string" ||
            !candidateToken.trim()
        ) {
            throw new Error("Please enter your administrator token.");
        }

        const token = candidateToken.trim();

        const controller = new AbortController();

        const timeout = setTimeout(function () {
            controller.abort();
        }, CONFIG.REQUEST_TIMEOUT);

        try {
            const response = await fetch(
                CONFIG.API_BASE_URL +
                CONFIG.LOGIN_VERIFICATION_ENDPOINT,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "X-Admin-Token": token
                    },
                    credentials: "omit",
                    cache: "no-store",
                    signal: controller.signal
                }
            );

            const data = await readResponse(response);

            if (!response.ok) {
                const error = new Error(
                    getErrorMessage(data, response.status)
                );

                error.status = response.status;
                error.data = data;

                throw error;
            }

            saveToken(token);

            return {
                success: true,
                message: "Administrator authentication successful."
            };

        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Login verification timed out. Please try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to the AVERRA server."
                );
            }

            throw error;

        } finally {
            clearTimeout(timeout);
        }
    }

    // --------------------------------------------------------
    // LOGIN FORM HANDLER
    // --------------------------------------------------------

    function initialiseLoginForm() {
        const loginForm = document.getElementById("login-form");

        // This script is also used by other administrator pages.
        if (!loginForm) {
            return;
        }

        const tokenInput = document.getElementById("admin-token");
        const loginButton = document.getElementById("login-button");
        const loginMessage = document.getElementById("login-message");

        if (!tokenInput || !loginButton || !loginMessage) {
            console.error(
                "AVERRA login form is missing one or more required elements."
            );
            return;
        }

        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const candidateToken = tokenInput.value.trim();

            if (!candidateToken) {
                loginMessage.textContent =
                    "Please enter your administrator token.";

                loginMessage.style.color = "#b42318";
                tokenInput.focus();
                return;
            }

            const originalButtonHTML = loginButton.innerHTML;

            loginButton.disabled = true;
            loginButton.textContent = "Verifying credentials...";

            loginMessage.textContent =
                "Connecting securely to the AVERRA server...";

            loginMessage.style.color = "#1d5f91";

            try {
                await verifyLogin(candidateToken);

                loginMessage.textContent =
                    "Login successful. Opening your dashboard...";

                loginMessage.style.color = "#16804a";

                // Redirect only after the backend confirms the token
                // and the browser successfully saves the session.
                window.location.replace(CONFIG.DASHBOARD_PAGE);

            } catch (error) {
                console.error(
                    "AVERRA administrator login failed:",
                    error.message
                );

                loginMessage.textContent =
                    error.message ||
                    "Login failed. Please try again.";

                loginMessage.style.color = "#b42318";

                if (error.status === 401) {
                    tokenInput.focus();
                    tokenInput.select();
                }

            } finally {
                loginButton.disabled = false;
                loginButton.innerHTML = originalButtonHTML;
            }
        });
    }

    // --------------------------------------------------------
    // SESSION VALIDATION
    // --------------------------------------------------------

    async function requireLogin() {
        const token = getToken();

        if (!token) {
            redirectToLogin();
            return false;
        }

        try {
            await api(CONFIG.LOGIN_VERIFICATION_ENDPOINT);
            return true;

        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                clearToken();
                redirectToLogin();
                return false;
            }

            console.error(
                "Administrator session verification failed:",
                error.message
            );

            showConnectionError(error.message);

            return false;
        }
    }

    function redirectToLogin() {
        const loginPage = "index.html";

        const currentPage = window.location.pathname
            .split("/")
            .pop();

        if (currentPage !== loginPage) {
            window.location.replace(loginPage);
        }
    }

    function showConnectionError(message) {
        const existing = document.getElementById(
            "averra-auth-error"
        );

        if (existing) {
            existing.textContent = message;
            return;
        }

        const notice = document.createElement("div");

        notice.id = "averra-auth-error";
        notice.setAttribute("role", "alert");

        notice.style.cssText = [
            "position:relative",
            "margin:16px",
            "padding:14px 18px",
            "border:1px solid #d97706",
            "border-radius:8px",
            "background:#fff7ed",
            "color:#9a3412",
            "font-size:14px"
        ].join(";");

        notice.textContent =
            "Authentication could not be verified: " + message;

        document.body.prepend(notice);
    }

    // --------------------------------------------------------
    // DELETE HELPERS
    // --------------------------------------------------------

    async function deleteEnquiry(enquiryId) {
        return api(
            "/api/admin/enquiries/" + encodeURIComponent(enquiryId),
            {
                method: "DELETE"
            }
        );
    }

    async function deleteApplication(applicationId) {
        return api(
            "/api/admin/applications/" + encodeURIComponent(applicationId),
            {
                method: "DELETE"
            }
        );
    }

    async function deleteJob(jobId) {
        return api(
            "/api/admin/jobs/" + encodeURIComponent(jobId),
            {
                method: "DELETE"
            }
        );
    }

    // --------------------------------------------------------
    // LOGOUT
    // --------------------------------------------------------

    function logout() {
        clearToken();
        window.location.replace("index.html");
    }

    // --------------------------------------------------------
    // PUBLIC ADMINISTRATOR API
    // --------------------------------------------------------

    window.AVERRA_ADMIN = Object.freeze({
        version: "3.9.0",

        apiBaseUrl: CONFIG.API_BASE_URL,

        api: api,

        verifyLogin: verifyLogin,

        requireLogin: requireLogin,

        isAuthenticated: isAuthenticated,

        getToken: getToken,

        clearToken: clearToken,

        deleteEnquiry: deleteEnquiry,

        deleteApplication: deleteApplication,

        deleteJob: deleteJob,

        logout: logout
    });

    // --------------------------------------------------------
    // INITIALISATION
    // --------------------------------------------------------

    currentToken = getStoredToken();

    initialiseLoginForm();

    console.info(
        "AVERRA administrator authentication initialised.",
        "Version:",
        "3.9.0"
    );

})();
