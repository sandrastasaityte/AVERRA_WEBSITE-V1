
/*
 * AVERRA STAFFING SOLUTIONS LTD
 * Main Website JavaScript
 * Version 5.0
 *
 * Responsibilities:
 * - Mobile navigation
 * - Active navigation links
 * - Sticky header support
 * - Smooth anchor scrolling
 * - Back-to-top button
 * - Automatic copyright year
 * - External-link security
 * - Accessible form validation
 * - Image error handling
 * - Compatibility with images.js
 * - Accessibility and reduced-motion support
 * - Safe, duplicate-resistant initialization
 */

(function () {
    "use strict";

    const VERSION = "5.0";
    const GLOBAL_KEY = "AVERRA";

    if (
        window[GLOBAL_KEY] &&
        window[GLOBAL_KEY].scriptVersion === VERSION
    ) {
        return;
    }

    window[GLOBAL_KEY] = window[GLOBAL_KEY] || {};
    window[GLOBAL_KEY].scriptVersion = VERSION;

    const SELECTORS = {
        navigation: "#main-navigation, #main-nav, .main-navigation, .main-nav",
        menuButton:
            ".mobile-menu-button, .menu-toggle, .mobile-nav-toggle",
        header: "header, .site-header, .main-header",
        backToTop: "#back-to-top, .back-to-top",
        year: "#current-year, #copyright-year, [data-current-year]",
        forms: "form",
        images: "img"
    };

    const REDUCED_MOTION = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    function selectAll(selector, root) {
        return Array.from(
            (root || document).querySelectorAll(selector)
        );
    }

    function selectOne(selector, root) {
        return (root || document).querySelector(selector);
    }

    function isReducedMotion() {
        return Boolean(REDUCED_MOTION && REDUCED_MOTION.matches);
    }

    function safeFocus(element) {
        if (!element) return;

        try {
            element.focus({ preventScroll: true });
        } catch (error) {
            element.focus();
        }
    }

    /*
     * MOBILE NAVIGATION
     *
     * Uses .active on the navigation and .menu-open on the body.
     * Keep these class names consistent with style.css.
     */

    function initializeMobileNavigation() {
        const buttons = selectAll(SELECTORS.menuButton);
        const navigations = selectAll(SELECTORS.navigation);

        if (!buttons.length || !navigations.length) return;

        buttons.forEach(function (button, index) {
            const navigation =
                document.getElementById(
                    button.getAttribute("aria-controls") || ""
                ) ||
                navigations[index] ||
                navigations[0];

            if (!navigation) return;

            if (!navigation.id) {
                navigation.id = "main-navigation";
            }

            button.setAttribute("aria-controls", navigation.id);
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-label", "Open navigation menu");
            button.setAttribute("type", "button");

            if (!button.hasAttribute("aria-haspopup")) {
                button.setAttribute("aria-haspopup", "true");
            }

            function isOpen() {
                return (
                    navigation.classList.contains("active") ||
                    button.getAttribute("aria-expanded") === "true"
                );
            }

            function setOpen(open, returnFocus) {
                navigation.classList.toggle("active", open);
                button.classList.toggle("active", open);
                document.body.classList.toggle("menu-open", open);

                button.setAttribute("aria-expanded", String(open));
                button.setAttribute(
                    "aria-label",
                    open
                        ? "Close navigation menu"
                        : "Open navigation menu"
                );

                if (returnFocus) {
                    safeFocus(button);
                }
            }

            if (button.dataset.averraNavInitialized === "true") {
                return;
            }

            button.dataset.averraNavInitialized = "true";

            button.addEventListener("click", function () {
                setOpen(!isOpen(), false);
            });

            navigation.addEventListener("click", function (event) {
                const link = event.target.closest("a");

                if (!link) return;

                const href = link.getAttribute("href") || "";

                if (
                    href.startsWith("#") ||
                    link.hostname === window.location.hostname
                ) {
                    setOpen(false, false);
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && isOpen()) {
                    setOpen(false, true);
                }
            });

            document.addEventListener("click", function (event) {
                if (!isOpen()) return;

                if (
                    !navigation.contains(event.target) &&
                    !button.contains(event.target)
                ) {
                    setOpen(false, false);
                }
            });

            if (!window.AVERRA_MENU_RESIZE_INITIALIZED) {
                window.AVERRA_MENU_RESIZE_INITIALIZED = true;

                window.addEventListener("resize", function () {
                    if (window.innerWidth > 820) {
                        navigations.forEach(function (nav) {
                            nav.classList.remove("active");
                        });

                        buttons.forEach(function (menuButton) {
                            menuButton.classList.remove("active");
                            menuButton.setAttribute(
                                "aria-expanded",
                                "false"
                            );
                            menuButton.setAttribute(
                                "aria-label",
                                "Open navigation menu"
                            );
                        });

                        document.body.classList.remove("menu-open");
                    }
                });
            }
        });
    }

    /*
     * ACTIVE NAVIGATION LINKS
     */

    function normalizePath(path) {
        if (!path) return "/";

        let result = path.split("?")[0].split("#")[0];

        if (result.endsWith("/index.html")) {
            result = result.slice(0, -"index.html".length);
        }

        if (!result.endsWith("/") && !result.includes(".")) {
            result += "/";
        }

        return result;
    }

    function initializeActiveNavigation() {
        const currentPath = normalizePath(window.location.pathname);

        selectAll(
            SELECTORS.navigation + " a[href]"
        ).forEach(function (link) {
            const href = link.getAttribute("href");

            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:")
            ) {
                return;
            }

            let linkUrl;

            try {
                linkUrl = new URL(href, window.location.href);
            } catch (error) {
                return;
            }

            if (linkUrl.origin !== window.location.origin) return;

            const linkPath = normalizePath(linkUrl.pathname);
            const isCurrent = linkPath === currentPath;

            if (isCurrent) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            } else {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            }
        });
    }

    /*
     * STICKY HEADER SUPPORT
     *
     * Adds .scrolled to the header after scrolling.
     * Style this class in style.css if you want a visual change.
     */

    function initializeStickyHeader() {
        const headers = selectAll(SELECTORS.header);

        if (!headers.length) return;

        let ticking = false;

        function updateHeader() {
            const shouldBeScrolled = window.scrollY > 20;

            headers.forEach(function (header) {
                header.classList.toggle(
                    "scrolled",
                    shouldBeScrolled
                );
            });

            ticking = false;
        }

        function requestHeaderUpdate() {
            if (ticking) return;

            ticking = true;

            if ("requestAnimationFrame" in window) {
                window.requestAnimationFrame(updateHeader);
            } else {
                updateHeader();
            }
        }

        if (!window.AVERRA_HEADER_SCROLL_INITIALIZED) {
            window.AVERRA_HEADER_SCROLL_INITIALIZED = true;

            window.addEventListener(
                "scroll",
                requestHeaderUpdate,
                { passive: true }
            );
        }

        updateHeader();
    }

    /*
     * SMOOTH SCROLLING
     *
     * Handles same-page anchor links and respects reduced-motion
     * preferences. Links to other pages continue to work normally.
     */

    function initializeSmoothScrolling() {
        if (window.AVERRA_SMOOTH_SCROLL_INITIALIZED) return;

        window.AVERRA_SMOOTH_SCROLL_INITIALIZED = true;

        document.addEventListener("click", function (event) {
            const link = event.target.closest("a[href]");

            if (!link) return;

            const href = link.getAttribute("href");

            if (
                !href ||
                !href.startsWith("#") ||
                href === "#" ||
                link.hasAttribute("download") ||
                link.target === "_blank"
            ) {
                return;
            }

            let target;

            try {
                target = document.querySelector(
                    CSS.escape
                        ? href
                        : href.replace(
                            /([^\w-])/g,
                            "\\$1"
                        )
                );
            } catch (error) {
                return;
            }

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: isReducedMotion() ? "auto" : "smooth",
                block: "start"
            });

            if (!target.hasAttribute("tabindex")) {
                target.setAttribute("tabindex", "-1");
            }

            safeFocus(target);

            if (window.history && window.history.pushState) {
                window.history.pushState(null, "", href);
            }
        });
    }

    /*
     * BACK-TO-TOP BUTTON
     *
     * Reuses an existing button if present; otherwise creates one.
     */

    function initializeBackToTop() {
        let button = selectOne(SELECTORS.backToTop);

        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.id = "back-to-top";
            button.className = "back-to-top";
            button.textContent = "↑";
            button.setAttribute("aria-label", "Back to top");
            button.title = "Back to top";

            document.body.appendChild(button);
        }

        if (button.dataset.averraTopInitialized === "true") {
            return;
        }

        button.dataset.averraTopInitialized = "true";
        button.hidden = true;

        button.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: isReducedMotion() ? "auto" : "smooth"
            });
        });

        let ticking = false;

        function updateVisibility() {
            button.hidden = window.scrollY < 350;
            ticking = false;
        }

        function requestVisibilityUpdate() {
            if (ticking) return;

            ticking = true;

            if ("requestAnimationFrame" in window) {
                window.requestAnimationFrame(updateVisibility);
            } else {
                updateVisibility();
            }
        }

        window.addEventListener(
            "scroll",
            requestVisibilityUpdate,
            { passive: true }
        );

        updateVisibility();
    }

    /*
     * COPYRIGHT YEAR
     *
     * Supports #current-year, #copyright-year and
     * [data-current-year].
     */

    function initializeCurrentYear() {
        const currentYear = new Date().getFullYear();

        selectAll(SELECTORS.year).forEach(function (element) {
            element.textContent = String(currentYear);
        });
    }

    /*
     * EXTERNAL LINK SECURITY
     *
     * Adds rel="noopener noreferrer" to external links that open
     * a new tab. It does not change internal navigation links.
     */

    function initializeExternalLinks() {
        selectAll('a[target="_blank"]').forEach(function (link) {
            let linkUrl;

            try {
                linkUrl = new URL(link.href, window.location.href);
            } catch (error) {
                return;
            }

            if (
                linkUrl.protocol !== "http:" &&
                linkUrl.protocol !== "https:"
            ) {
                return;
            }

            if (linkUrl.origin !== window.location.origin) {
                const relValues = new Set(
                    (link.getAttribute("rel") || "")
                        .split(/\s+/)
                        .filter(Boolean)
                );

                relValues.add("noopener");
                relValues.add("noreferrer");

                link.setAttribute(
                    "rel",
                    Array.from(relValues).join(" ")
                );
            }
        });
    }

    /*
     * FORM VALIDATION
     *
     * Uses browser-native validation and adds accessible inline
     * messages. Forms that use novalidate are left alone.
     * Existing submission behavior is preserved.
     */

    function initializeFormValidation() {
        selectAll(SELECTORS.forms).forEach(function (form) {
            if (
                form.dataset.averraFormInitialized === "true" ||
                form.hasAttribute("novalidate")
            ) {
                return;
            }

            form.dataset.averraFormInitialized = "true";

            const fields = selectAll(
                "input, select, textarea",
                form
            ).filter(function (field) {
                return ![
                    "submit",
                    "button",
                    "reset",
                    "hidden"
                ].includes((field.type || "").toLowerCase());
            });

            function clearFieldError(field) {
                field.removeAttribute("aria-invalid");

                const errorId = field.dataset.averraErrorId;

                if (errorId) {
                    const errorElement =
                        document.getElementById(errorId);

                    if (errorElement) {
                        errorElement.remove();
                    }

                    delete field.dataset.averraErrorId;
                }
            }

            function showFieldError(field, message) {
                clearFieldError(field);

                field.setAttribute("aria-invalid", "true");

                const error = document.createElement("span");
                const errorId =
                    "averra-error-" +
                    Math.random().toString(36).slice(2, 10);

                error.id = errorId;
                error.className = "form-field-error";
                error.setAttribute("role", "alert");
                error.textContent = message;

                field.dataset.averraErrorId = errorId;
                field.insertAdjacentElement("afterend", error);

                const existingDescribedBy =
                    field.getAttribute("aria-describedby") || "";

                const describedBy = new Set(
                    existingDescribedBy
                        .split(/\s+/)
                        .filter(Boolean)
                );

                describedBy.add(errorId);

                field.setAttribute(
                    "aria-describedby",
                    Array.from(describedBy).join(" ")
                );
            }

            function validateField(field) {
                clearFieldError(field);

                if (field.disabled) return true;

                if (field.validity.valid) return true;

                let message = "Please check this field.";

                if (field.validity.valueMissing) {
                    message = "Please complete this required field.";
                } else if (field.validity.typeMismatch) {
                    message =
                        field.type === "email"
                            ? "Please enter a valid email address."
                            : "Please enter a valid value.";
                } else if (field.validity.patternMismatch) {
                    message = "Please use the requested format.";
                } else if (field.validity.tooShort) {
                    message =
                        "Please enter at least " +
                        field.minLength +
                        " characters.";
                } else if (field.validity.tooLong) {
                    message =
                        "Please enter no more than " +
                        field.maxLength +
                        " characters.";
                } else if (field.validity.rangeUnderflow) {
                    message = "The value is below the permitted minimum.";
                } else if (field.validity.rangeOverflow) {
                    message = "The value exceeds the permitted maximum.";
                } else if (field.validity.stepMismatch) {
                    message = "Please enter an allowed value.";
                }

                showFieldError(field, message);
                return false;
            }

            fields.forEach(function (field) {
                field.addEventListener("input", function () {
                    if (field.getAttribute("aria-invalid") === "true") {
                        validateField(field);
                    }
                });

                field.addEventListener("change", function () {
                    if (field.getAttribute("aria-invalid") === "true") {
                        validateField(field);
                    }
                });
            });

            form.addEventListener("submit", function (event) {
                let firstInvalidField = null;

                fields.forEach(function (field) {
                    if (!validateField(field) && !firstInvalidField) {
                        firstInvalidField = field;
                    }
                });

                if (firstInvalidField) {
                    event.preventDefault();
                    safeFocus(firstInvalidField);
                }
            });
        });
    }

    /*
     * IMAGE ERROR HANDLING
     *
     * Leaves images.js in control of image selection.
     * This only marks genuinely failed images and avoids endless
     * error loops. It does not invent replacement image filenames.
     */

    function initializeImageHandling() {
        function handleImage(image) {
            if (
                image.dataset.averraImageInitialized === "true"
            ) {
                return;
            }

            image.dataset.averraImageInitialized = "true";

            image.addEventListener("error", function () {
                image.classList.add("image-load-error");
                image.setAttribute("data-image-error", "true");

                if (!image.hasAttribute("alt")) {
                    image.setAttribute("alt", "");
                }
            });

            image.addEventListener("load", function () {
                image.classList.remove("image-load-error");
                image.removeAttribute("data-image-error");
            });

            if (image.complete && image.naturalWidth === 0 && image.src) {
                image.classList.add("image-load-error");
                image.setAttribute("data-image-error", "true");
            }
        }

        selectAll(SELECTORS.images).forEach(handleImage);

        if (
            !window.MutationObserver ||
            window.AVERRA_IMAGE_OBSERVER_INITIALIZED
        ) {
            return;
        }

        window.AVERRA_IMAGE_OBSERVER_INITIALIZED = true;

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;

                    if (node.matches && node.matches("img")) {
                        handleImage(node);
                    }

                    if (node.querySelectorAll) {
                        selectAll("img", node).forEach(handleImage);
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    /*
     * ACCESSIBILITY IMPROVEMENTS
     */

    function initializeAccessibility() {
        // Ensure buttons inside forms do not submit by accident
        // unless they are explicitly submit buttons.
        selectAll("form button:not([type])").forEach(function (button) {
            button.setAttribute("type", "button");
        });

        // Add accessible names to icon-only links where a title
        // already exists, without guessing what the link does.
        selectAll("a[title]:not([aria-label])").forEach(function (link) {
            const visibleText = (link.textContent || "").trim();

            if (!visibleText) {
                link.setAttribute("aria-label", link.title);
            }
        });
    }

    /*
     * PAGE INITIALIZATION
     */

    function initializePage() {
        initializeMobileNavigation();
        initializeActiveNavigation();
        initializeStickyHeader();
        initializeSmoothScrolling();
        initializeBackToTop();
        initializeCurrentYear();
        initializeExternalLinks();
        initializeFormValidation();
        initializeImageHandling();
        initializeAccessibility();

        document.documentElement.classList.add("averra-js-enabled");
        document.documentElement.dataset.averraScriptVersion = VERSION;
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializePage,
            { once: true }
        );
    } else {
        initializePage();
    }

    // Public methods for optional use by other site scripts.
    window.AVERRA.initialize = initializePage;
    window.AVERRA.updateCurrentYear = initializeCurrentYear;
    window.AVERRA.updateActiveNavigation = initializeActiveNavigation;

})();
