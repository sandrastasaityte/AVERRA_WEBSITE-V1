**File: `script.js` — Version 4.1**

```javascript
/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   MASTER WEBSITE JAVASCRIPT
   Version: 4.1
   ============================================================

   FEATURES
   - Responsive mobile navigation
   - Supports .menu-toggle and .mobile-menu-button
   - Accessible keyboard navigation
   - Automatic active navigation links
   - Sticky header
   - Accessible same-page scrolling
   - Back-to-top button
   - Automatic copyright year
   - Secure external links
   - Accessible form validation
   - Job application and contact form support
   - Compatible with images.js and legacy image catalogues
   - Broken-image detection
   - Dynamic image handling
   - Reduced-motion support
   - Browser diagnostics
   - Prevents duplicate initialization

   FILE LOCATION
   AVERRA_WEBSITE_V1/script.js

   SCRIPT ORDER
   <script src="images.js" defer></script>
   <script src="script.js" defer></script>

   NOTE
   Form validation does not send emails. Forms require
   a working backend or form-processing service.
   ============================================================ */

(function () {
    "use strict";

    const VERSION = "4.1";

    /* Prevent accidental duplicate initialization. */
    if (
        window.AVERRA &&
        window.AVERRA.scriptVersion === VERSION
    ) {
        return;
    }

    const AVERRA = window.AVERRA || {};
    AVERRA.version = VERSION;
    AVERRA.scriptVersion = VERSION;

    const CONFIG = {
        mobileBreakpoint: 900,
        headerScrollThreshold: 20,
        backToTopThreshold: 500,
        imageErrorClass: "image-error",
        fieldErrorClass: "field-error"
    };

    const reducedMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    /* ========================================================
       1. SHARED HELPERS
       ======================================================== */

    function ready(callback) {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                callback,
                { once: true }
            );
        } else {
            callback();
        }
    }

    function select(selector, parent) {
        return (parent || document).querySelector(selector);
    }

    function selectAll(selector, parent) {
        return Array.from(
            (parent || document).querySelectorAll(selector)
        );
    }

    function isMobile() {
        return window.innerWidth <= CONFIG.mobileBreakpoint;
    }

    function prefersReducedMotion() {
        return Boolean(reducedMotion && reducedMotion.matches);
    }

    function requestFrame(callback) {
        if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(callback);
        } else {
            callback();
        }
    }

    function safeFocus(element) {
        if (!element || typeof element.focus !== "function") {
            return;
        }

        try {
            element.focus({ preventScroll: true });
        } catch (error) {
            element.focus();
        }
    }

    function getHeader() {
        return select(".site-header");
    }

    function getNavigation() {
        return select(
            "#main-navigation, .main-navigation, .main-nav"
        );
    }

    function getMenuButton() {
        return select(
            ".mobile-menu-button, .menu-toggle, .mobile-nav-toggle"
        );
    }

    /* ========================================================
       2. MOBILE NAVIGATION
       ======================================================== */

    function initializeMobileNavigation() {
        const button = getMenuButton();
        const navigation = getNavigation();

        if (!button || !navigation) {
            return;
        }

        if (!navigation.id) {
            navigation.id = "main-navigation";
        }

        button.setAttribute("aria-controls", navigation.id);

        if (
            button.tagName.toLowerCase() === "button" &&
            !button.hasAttribute("type")
        ) {
            button.type = "button";
        }

        function isOpen() {
            return navigation.classList.contains("active");
        }

        function updateButton(open) {
            button.setAttribute("aria-expanded", String(open));

            button.setAttribute(
                "aria-label",
                open ? "Close navigation menu" : "Open navigation menu"
            );

            button.setAttribute(
                "title",
                open ? "Close navigation menu" : "Open navigation menu"
            );
        }

        function closeMenu(returnFocus) {
            navigation.classList.remove("active");
            document.body.classList.remove("menu-open");
            updateButton(false);

            if (returnFocus && isMobile()) {
                safeFocus(button);
            }
        }

        function openMenu() {
            if (!isMobile()) {
                return;
            }

            navigation.classList.add("active");
            document.body.classList.add("menu-open");
            updateButton(true);
        }

        if (button.dataset.averraMenuInitialized !== "true") {
            button.dataset.averraMenuInitialized = "true";

            button.addEventListener("click", function (event) {
                event.preventDefault();

                if (isOpen()) {
                    closeMenu(false);
                } else {
                    openMenu();
                }
            });
        }

        if (navigation.dataset.averraMenuInitialized !== "true") {
            navigation.dataset.averraMenuInitialized = "true";

            navigation.addEventListener("click", function (event) {
                if (
                    event.target.closest("a") &&
                    isMobile()
                ) {
                    closeMenu(false);
                }
            });
        }

        if (document.body.dataset.averraMenuInitialized !== "true") {
            document.body.dataset.averraMenuInitialized = "true";

            document.addEventListener("click", function (event) {
                if (!isMobile() || !isOpen()) {
                    return;
                }

                if (
                    button.contains(event.target) ||
                    navigation.contains(event.target)
                ) {
                    return;
                }

                closeMenu(false);
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && isOpen()) {
                    closeMenu(true);
                }
            });
        }

        if (!window.AVERRA_MENU_RESIZE_INITIALIZED) {
            window.AVERRA_MENU_RESIZE_INITIALIZED = true;

            let resizeScheduled = false;

            window.addEventListener("resize", function () {
                if (resizeScheduled) {
                    return;
                }

                resizeScheduled = true;

                requestFrame(function () {
                    if (!isMobile()) {
                        navigation.classList.remove("active");
                        document.body.classList.remove("menu-open");
                        updateButton(false);
                    }

                    resizeScheduled = false;
                });
            }, { passive: true });
        }

        updateButton(isOpen());
    }

    /* ========================================================
       3. ACTIVE NAVIGATION LINKS
       ======================================================== */

    function normalizePath(path) {
        let value = path || "/";

        try {
            value = decodeURIComponent(value);
        } catch (error) {
            // Retain the original path.
        }

        value = value.replace(/\/+$/, "");

        return value || "/";
    }

    function pageKey(path) {
        const normalized = normalizePath(path);
        const last = normalized.split("/").pop().toLowerCase();

        if (
            !last ||
            last === "index" ||
            last === "index.html"
        ) {
            return "index.html";
        }

        return last;
    }

    function initializeActiveNavigation() {
        const links = selectAll(
            ".main-nav a[href], " +
            ".main-navigation a[href], " +
            "#main-navigation a[href]"
        );

        const currentPage = pageKey(location.pathname);

        links.forEach(function (link) {
            let url;

            try {
                url = new URL(
                    link.getAttribute("href"),
                    location.href
                );
            } catch (error) {
                return;
            }

            if (url.origin !== location.origin) {
                return;
            }

            const matches = pageKey(url.pathname) === currentPage;

            link.classList.toggle("active", matches);

            if (matches) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    /* ========================================================
       4. STICKY HEADER
       ======================================================== */

    function initializeHeaderScroll() {
        const header = getHeader();

        if (!header) {
            return;
        }

        let scheduled = false;

        function update() {
            header.classList.toggle(
                "scrolled",
                window.scrollY > CONFIG.headerScrollThreshold
            );

            scheduled = false;
        }

        function scheduleUpdate() {
            if (scheduled) {
                return;
            }

            scheduled = true;
            requestFrame(update);
        }

        update();

        if (header.dataset.averraScrollInitialized !== "true") {
            header.dataset.averraScrollInitialized = "true";

            window.addEventListener(
                "scroll",
                scheduleUpdate,
                { passive: true }
            );
        }
    }

    /* ========================================================
       5. SAME-PAGE ANCHOR SCROLLING
       ======================================================== */

    function initializeSmoothScrolling() {
        if (document.body.dataset.averraAnchorsInitialized === "true") {
            return;
        }

        document.body.dataset.averraAnchorsInitialized = "true";

        document.addEventListener("click", function (event) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const link = event.target.closest("a[href]");

            if (
                !link ||
                link.hasAttribute("download") ||
                link.target === "_blank"
            ) {
                return;
            }

            const href = link.getAttribute("href");

            if (!href || href === "#") {
                return;
            }

            let url;

            try {
                url = new URL(href, location.href);
            } catch (error) {
                return;
            }

            if (
                url.origin !== location.origin ||
                url.pathname !== location.pathname ||
                !url.hash
            ) {
                return;
            }

            let id;

            try {
                id = decodeURIComponent(url.hash.slice(1));
            } catch (error) {
                return;
            }

            const target = document.getElementById(id);

            if (!target) {
                return;
            }

            event.preventDefault();

            const header = getHeader();
            const headerHeight = header
                ? header.getBoundingClientRect().height
                : 0;

            const top =
                target.getBoundingClientRect().top +
                window.scrollY -
                headerHeight -
                16;

            window.scrollTo({
                top: Math.max(0, top),
                behavior: prefersReducedMotion() ? "auto" : "smooth"
            });

            if (location.hash !== url.hash) {
                history.pushState(null, "", url.hash);
            }

            const temporaryTabindex =
                !target.hasAttribute("tabindex") &&
                !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(
                    target.tagName
                );

            if (temporaryTabindex) {
                target.setAttribute("tabindex", "-1");

                target.addEventListener("blur", function restore() {
                    target.removeAttribute("tabindex");
                    target.removeEventListener("blur", restore);
                });
            }

            safeFocus(target);
        });
    }

    /* ========================================================
       6. BACK-TO-TOP BUTTON
       ======================================================== */

    function initializeBackToTop() {
        let button = select(".back-to-top");

        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "back-to-top";
            button.textContent = "↑";
            button.setAttribute("aria-label", "Back to top");
            button.setAttribute("title", "Back to top");
            document.body.appendChild(button);
        }

        if (button.dataset.averraBackToTopInitialized === "true") {
            return;
        }

        button.dataset.averraBackToTopInitialized = "true";

        let scheduled = false;

        function update() {
            const visible = window.scrollY > CONFIG.backToTopThreshold;

            button.classList.toggle("visible", visible);
            button.hidden = !visible;

            scheduled = false;
        }

        function scheduleUpdate() {
            if (scheduled) {
                return;
            }

            scheduled = true;
            requestFrame(update);
        }

        button.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion() ? "auto" : "smooth"
            });
        });

        window.addEventListener(
            "scroll",
            scheduleUpdate,
            { passive: true }
        );

        update();
    }

    /* ========================================================
       7. COPYRIGHT YEAR
       ======================================================== */

    function initializeCurrentYear() {
        const year = String(new Date().getFullYear());

        selectAll(".current-year, [data-current-year]")
            .forEach(function (element) {
                element.textContent = year;
            });
    }

    /* ========================================================
       8. EXTERNAL LINK SECURITY
       ======================================================== */

    function initializeExternalLinks() {
        selectAll("a[href]").forEach(function (link) {
            const href = link.getAttribute("href");

            if (
                !href ||
                href.startsWith("#") ||
                /^(mailto:|tel:|javascript:|data:)/i.test(href)
            ) {
                return;
            }

            let url;

            try {
                url = new URL(href, location.href);
            } catch (error) {
                return;
            }

            if (
                !["http:", "https:"].includes(url.protocol) ||
                url.origin === location.origin ||
                link.target !== "_blank"
            ) {
                return;
            }

            const rel = new Set(
                (link.getAttribute("rel") || "")
                    .split(/\s+/)
                    .filter(Boolean)
            );

            rel.add("noopener");
            rel.add("noreferrer");

            link.setAttribute("rel", Array.from(rel).join(" "));
        });
    }

    /* ========================================================
       9. FORM VALIDATION HELPERS
       ======================================================== */

    function errorIdFor(field) {
        if (!field.id) {
            const name = (field.name || "field")
                .replace(/[^a-zA-Z0-9_-]/g, "-");

            field.id = "averra-" + name + "-" +
                Math.random().toString(36).slice(2, 8);
        }

        return field.id + "-error";
    }

    function showFieldError(field, message) {
        const errorId = errorIdFor(field);

        field.setAttribute("aria-invalid", "true");

        let error = document.getElementById(errorId);

        if (!error) {
            error = document.createElement("div");
            error.id = errorId;
            error.className = CONFIG.fieldErrorClass;
            error.setAttribute("role", "alert");

            const container =
                field.closest(".form-field, .form-group") ||
                field.parentElement;

            if (container) {
                container.appendChild(error);
            }
        }

        error.textContent = message;

        const descriptions = new Set(
            (field.getAttribute("aria-describedby") || "")
                .split(/\s+/)
                .filter(Boolean)
        );

        descriptions.add(errorId);

        field.setAttribute(
            "aria-describedby",
            Array.from(descriptions).join(" ")
        );
    }

    function clearFieldError(field) {
        field.removeAttribute("aria-invalid");

        if (!field.id) {
            return;
        }

        const errorId = field.id + "-error";
        const error = document.getElementById(errorId);

        if (error) {
            error.remove();
        }

        const descriptions = (
            field.getAttribute("aria-describedby") || ""
        ).split(/\s+/).filter(Boolean);

        const remaining = descriptions.filter(function (id) {
            return id !== errorId;
        });

        if (remaining.length) {
            field.setAttribute(
                "aria-describedby",
                remaining.join(" ")
            );
        } else {
            field.removeAttribute("aria-describedby");
        }
    }

    function validateForm(form) {
        let valid = true;
        let firstInvalid = null;

        const fields = selectAll(
            "input, textarea, select",
            form
        );

        fields.forEach(clearFieldError);

        function invalidate(field, message) {
            showFieldError(field, message);
            valid = false;

            if (!firstInvalid) {
                firstInvalid = field;
            }
        }

        /* Required radio groups. */
        const radioGroups = new Map();

        fields.forEach(function (field) {
            if (
                field.type === "radio" &&
                field.required &&
                field.name
            ) {
                if (!radioGroups.has(field.name)) {
                    radioGroups.set(field.name, []);
                }

                radioGroups.get(field.name).push(field);
            }
        });

        radioGroups.forEach(function (radios) {
            if (!radios.some(function (radio) {
                return radio.checked;
            })) {
                invalidate(radios[0], "Please select an option.");
            }
        });

        fields.forEach(function (field) {
            if (field.disabled || field.type === "radio") {
                return;
            }

            if (field.required) {
                if (
                    field.type === "checkbox" &&
                    !field.checked
                ) {
                    invalidate(field, "Please tick this checkbox.");
                    return;
                }

                if (
                    field.type !== "checkbox" &&
                    !String(field.value || "").trim()
                ) {
                    invalidate(field, "This field is required.");
                    return;
                }
            }

            if (
                field.type !== "checkbox" &&
                field.value !== "" &&
                !field.validity.valid
            ) {
                let message = "Please check this field.";

                if (
                    field.type === "email" &&
                    field.validity.typeMismatch
                ) {
                    message = "Please enter a valid email address.";
                } else if (field.validity.tooShort) {
                    message = "Please enter more information.";
                } else if (field.validity.tooLong) {
                    message = "Your entry is too long.";
                } else if (field.validity.patternMismatch) {
                    message = "Please use the requested format.";
                }

                invalidate(field, message);
            }
        });

        if (!valid && firstInvalid) {
            safeFocus(firstInvalid);
        }

        return valid;
    }

    /* ========================================================
       10. FORM HANDLING
       ======================================================== */

    function initializeFormValidation() {
        selectAll("form").forEach(function (form) {
            if (form.dataset.averraFormInitialized === "true") {
                return;
            }

            form.dataset.averraFormInitialized = "true";

            const fields = selectAll(
                "input, textarea, select",
                form
            );

            fields.forEach(function (field) {
                ["input", "change"].forEach(function (eventName) {
                    field.addEventListener(eventName, function () {
                        if (field.type === "radio") {
                            const radios = fields.filter(function (item) {
                                return (
                                    item.type === "radio" &&
                                    item.name === field.name
                                );
                            });

                            radios.forEach(clearFieldError);
                            return;
                        }

                        if (field.type === "checkbox") {
                            if (!field.required || field.checked) {
                                clearFieldError(field);
                            }

                            return;
                        }

                        if (field.validity.valid) {
                            clearFieldError(field);
                        }
                    });
                });
            });

            form.addEventListener("submit", function (event) {
                if (!validateForm(form)) {
                    event.preventDefault();
                    return;
                }

                const action = (
                    form.getAttribute("action") || ""
                ).trim();

                const placeholderAction =
                    !action ||
                    action === "#" ||
                    /^javascript:/i.test(action);

                if (placeholderAction) {
                    event.preventDefault();

                    let notice = select(
                        "[data-form-configuration-notice]",
                        form
                    );

                    if (!notice) {
                        notice = document.createElement("p");

                        notice.setAttribute(
                            "data-form-configuration-notice",
                            ""
                        );

                        notice.className = "form-notice";
                        notice.setAttribute("role", "status");

                        form.appendChild(notice);
                    }

                    notice.textContent =
                        "This form is not connected yet. Please contact " +
                        "info@averrastaffing.co.uk until online submissions " +
                        "are configured.";

                    return;
                }

                /*
                 * For a real action URL, let the browser submit the form.
                 * Do not simulate success or claim an email was sent.
                 */
            });
        });
    }

    /* ========================================================
       11. IMAGE CATALOGUE COMPATIBILITY
       ======================================================== */

    function normalizeImageRecord(record) {
        if (typeof record === "string") {
            return {
                src: record,
                alt: ""
            };
        }

        if (!record || typeof record !== "object") {
            return null;
        }

        const src =
            record.src ||
            record.path ||
            record.file ||
            record.url ||
            record.filename ||
            "";

        if (typeof src !== "string" || !src.trim()) {
            return null;
        }

        return {
            src: src.trim(),
            alt: typeof record.alt === "string"
                ? record.alt
                : ""
        };
    }

    function resolveConfiguredImage(section, key) {
        const root =
            window.AVERRA_IMAGES ||
            window.imageData ||
            window.IMAGE_DATA;

        if (typeof window.getImageUrl === "function") {
            try {
                const result = window.getImageUrl(key);

                if (typeof result === "string" && result.trim()) {
                    return normalizeImageRecord(result);
                }
            } catch (error) {
                // Continue to other supported interfaces.
            }
        }

        if (typeof window.getImageByKey === "function") {
            try {
                const result = window.getImageByKey(section, key);

                if (result) {
                    return normalizeImageRecord(result);
                }
            } catch (error) {
                // Continue to other supported interfaces.
            }
        }

        if (typeof window.getImage === "function") {
            try {
                const result = window.getImage(key);

                if (result) {
                    return normalizeImageRecord(result);
                }
            } catch (error) {
                // Continue to the catalogue object.
            }
        }

        if (!root || typeof root !== "object") {
            return null;
        }

        let record = null;

        if (
            section &&
            root[section] &&
            typeof root[section] === "object"
        ) {
            record = root[section][key];
        }

        if (!record) {
            record = root[key];
        }

        return normalizeImageRecord(record);
    }

    function initializeConfiguredImages() {
        selectAll(
            "img[data-image-section][data-image-name], " +
            "img[data-image-key]"
        ).forEach(function (img) {
            const section =
                img.getAttribute("data-image-section") || "";

            const key =
                img.getAttribute("data-image-name") ||
                img.getAttribute("data-image-key");

            if (!key) {
                return;
            }

            const image = resolveConfiguredImage(section, key);

            if (!image || !image.src) {
                return;
            }

            if (img.getAttribute("src") !== image.src) {
                img.setAttribute("src", image.src);
            }

            if (
                image.alt &&
                !img.hasAttribute("data-preserve-alt")
            ) {
                img.alt = image.alt;
            }
        });
    }

    /* ========================================================
       12. IMAGE ERROR HANDLING
       ======================================================== */

    function initializeImageHandling() {
        function attachImageHandlers(img) {
            if (img.dataset.averraImageInitialized === "true") {
                return;
            }

            img.dataset.averraImageInitialized = "true";

            img.addEventListener("error", function () {
                img.classList.add(CONFIG.imageErrorClass);
                img.setAttribute("data-image-error", "true");
            });

            img.addEventListener("load", function () {
                img.classList.remove(CONFIG.imageErrorClass);
                img.removeAttribute("data-image-error");
            });

            if (
                img.complete &&
                img.naturalWidth === 0 &&
                (img.currentSrc || img.src)
            ) {
                img.classList.add(CONFIG.imageErrorClass);
                img.setAttribute("data-image-error", "true");
            }
        }

        selectAll("img").forEach(attachImageHandlers);

        if (typeof MutationObserver !== "function") {
            return;
        }

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        return;
                    }

                    if (node.matches("img")) {
                        attachImageHandlers(node);
                    }

                    selectAll("img", node).forEach(attachImageHandlers);
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /* ========================================================
       13. ACCESSIBILITY
       ======================================================== */

    function initializeAccessibility() {
        if (document.body.dataset.averraAccessibilityInitialized === "true") {
            return;
        }

        document.body.dataset.averraAccessibilityInitialized = "true";

        document.addEventListener("keydown", function (event) {
            if (event.key === "Tab") {
                document.body.classList.add("keyboard-navigation");
            }
        });

        ["mousedown", "touchstart"].forEach(function (eventName) {
            document.addEventListener(
                eventName,
                function () {
                    document.body.classList.remove(
                        "keyboard-navigation"
                    );
                },
                { passive: true }
            );
        });

        selectAll("button, a").forEach(function (element) {
            const hasName =
                element.hasAttribute("aria-label") ||
                element.hasAttribute("aria-labelledby") ||
                element.hasAttribute("title") ||
                element.textContent.trim() !== "";

            if (hasName) {
                return;
            }

            const image = select("img[alt]", element);

            if (image && image.alt.trim()) {
                element.setAttribute("aria-label", image.alt.trim());
            }
        });
    }

    /* ========================================================
       14. REDUCED MOTION
       ======================================================== */

    function initializeReducedMotion() {
        if (!reducedMotion) {
            return;
        }

        function update() {
            document.documentElement.classList.toggle(
                "reduced-motion",
                reducedMotion.matches
            );
        }

        update();

        if (typeof reducedMotion.addEventListener === "function") {
            reducedMotion.addEventListener("change", update);
        } else if (typeof reducedMotion.addListener === "function") {
            reducedMotion.addListener(update);
        }
    }

    /* ========================================================
       15. PAGE LOAD STATE
       ======================================================== */

    function initializePageLoad() {
        requestFrame(function () {
            document.documentElement.classList.add("page-loaded");
        });
    }

    /* ========================================================
       16. BROWSER DIAGNOSTICS
       ======================================================== */

    function diagnostics() {
        const images = selectAll("img");
        const forms = selectAll("form");

        const report = {
            version: VERSION,
            page: location.pathname,
            title: document.title,
            navigationFound: Boolean(getNavigation()),
            menuButtonFound: Boolean(getMenuButton()),
            headerFound: Boolean(getHeader()),
            imageCount: images.length,
            brokenImages: images
                .filter(function (img) {
                    return (
                        img.complete &&
                        img.naturalWidth === 0 &&
                        Boolean(img.currentSrc || img.src)
                    );
                })
                .map(function (img) {
                    return img.currentSrc || img.src;
                }),
            formCount: forms.length,
            formsWithoutAction: forms
                .filter(function (form) {
                    const action = (
                        form.getAttribute("action") || ""
                    ).trim();

                    return !action || action === "#";
                })
                .length
        };

        console.table(report);

        return report;
    }

    /* ========================================================
       17. INITIALIZE
       ======================================================== */

    function initializeWebsite() {
        initializeMobileNavigation();
        initializeActiveNavigation();
        initializeHeaderScroll();
        initializeSmoothScrolling();
        initializeBackToTop();
        initializeCurrentYear();
        initializeExternalLinks();
        initializeFormValidation();
        initializeConfiguredImages();
        initializeImageHandling();
        initializeAccessibility();
        initializeReducedMotion();
        initializePageLoad();

        AVERRA.diagnostics = diagnostics;

        document.documentElement.setAttribute(
            "data-averra-script",
            VERSION
        );
    }

    AVERRA.initialize = initializeWebsite;
    AVERRA.diagnostics = diagnostics;

    window.AVERRA = AVERRA;

    ready(initializeWebsite);

})();
```

