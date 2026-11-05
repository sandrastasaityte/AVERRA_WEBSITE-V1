"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   File: admin/js/admin-header.js
   Version: 1.0.0

   Shared administrator header.

   FEATURES
   - One consistent header across admin pages
   - Automatic active-page highlighting
   - Responsive mobile navigation
   - View website link
   - Existing auth.js logout integration
   - Jobs active on both jobs.html and job-form.html

   Does not replace or modify auth.js.
   ============================================================ */

(function () {
    const VERSION = "1.0.0";

    if (
        window.AVERRA_ADMIN_HEADER &&
        window.AVERRA_ADMIN_HEADER.version === VERSION
    ) {
        return;
    }

    const navigationItems = [
        {
            label: "Dashboard",
            href: "dashboard.html",
            page: "dashboard"
        },
        {
            label: "Jobs",
            href: "jobs.html",
            page: "jobs"
        },
        {
            label: "Applications",
            href: "applications.html",
            page: "applications"
        },
        {
            label: "Enquiries",
            href: "enquiries.html",
            page: "enquiries"
        }
    ];

    function getCurrentPage() {
        const path = window.location.pathname
            .toLowerCase()
            .split("/")
            .pop();

        const pageMap = {
            "dashboard.html": "dashboard",
            "jobs.html": "jobs",
            "job-form.html": "jobs",
            "applications.html": "applications",
            "enquiries.html": "enquiries"
        };

        return pageMap[path] || "dashboard";
    }

    function createHeader() {
        const currentPage = getCurrentPage();

        const header = document.createElement("header");

        header.className = "admin-header";
        header.setAttribute("data-shared-admin-header", VERSION);

        const top = document.createElement("div");
        top.className = "admin-header-top";

        const brandContainer = document.createElement("div");
        brandContainer.className = "admin-header-brand";

        const brand = document.createElement("p");
        brand.className = "brand";

        const brandName = document.createTextNode("AVERRA ");

        const brandAdmin = document.createElement("span");
        brandAdmin.textContent = "ADMIN";

        brand.appendChild(brandName);
        brand.appendChild(brandAdmin);

        const subtitle = document.createElement("p");
        subtitle.className = "header-subtitle";
        subtitle.textContent =
            "Staffing Solutions Ltd · Administration";

        brandContainer.appendChild(brand);
        brandContainer.appendChild(subtitle);

        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className = "admin-menu-toggle";
        menuButton.id = "admin-menu-toggle";
        menuButton.textContent = "Menu";
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute(
            "aria-controls",
            "admin-primary-nav"
        );

        top.appendChild(brandContainer);
        top.appendChild(menuButton);

        const nav = document.createElement("nav");
        nav.className = "admin-primary-nav";
        nav.id = "admin-primary-nav";
        nav.setAttribute(
            "aria-label",
            "Administrator navigation"
        );

        navigationItems.forEach(function (item) {
            const link = document.createElement("a");

            link.href = item.href;
            link.textContent = item.label;

            if (item.page === currentPage) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }

            nav.appendChild(link);
        });

        const websiteLink = document.createElement("a");

        websiteLink.href = "https://averrastaffing.co.uk/";
        websiteLink.target = "_blank";
        websiteLink.rel = "noopener noreferrer";
        websiteLink.className = "admin-website-link";
        websiteLink.textContent = "View website";

        nav.appendChild(websiteLink);

        const logoutButton = document.createElement("button");

        logoutButton.type = "button";
        logoutButton.id = "logout-button";
        logoutButton.className = "admin-logout-button";
        logoutButton.textContent = "Log out";

        nav.appendChild(logoutButton);

        header.appendChild(top);
        header.appendChild(nav);

        menuButton.addEventListener("click", function () {
            const isExpanded =
                menuButton.getAttribute("aria-expanded") === "true";

            menuButton.setAttribute(
                "aria-expanded",
                String(!isExpanded)
            );

            nav.classList.toggle("is-open", !isExpanded);

            menuButton.textContent = isExpanded
                ? "Menu"
                : "Close menu";
        });

        return header;
    }

    function initialise() {
        /*
         * Prevent duplicate headers if the script is
         * accidentally included more than once.
         */
        if (
            document.querySelector(
                "[data-shared-admin-header]"
            )
        ) {
            return;
        }

        /*
         * Remove old navigation bars and headers.
         * The application details modal header is not affected.
         */
        document.querySelectorAll(
            "header.admin-header, nav.admin-navigation"
        ).forEach(function (element) {
            element.remove();
        });

        const header = createHeader();

        document.body.insertBefore(
            header,
            document.body.firstChild
        );
    }

    window.AVERRA_ADMIN_HEADER = {
        version: VERSION,
        initialise: initialise
    };

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