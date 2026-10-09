
/* =========================================================
   AVERRA STAFFING SOLUTIONS LTD
   MASTER WEBSITE JAVASCRIPT
   Version: 3.0
   =========================================================

   FEATURES
   - Responsive mobile navigation
   - Accessible menu controls and keyboard support
   - Automatic active navigation links
   - Sticky header scroll state
   - Accessible same-page anchor navigation
   - Back-to-top button
   - Automatic copyright year
   - Safe external-link handling
   - Accessible HTML form validation
   - Radio-group and checkbox validation
   - Form submission state management
   - Optional imageData.js integration
   - Image loading and error handling
   - Keyboard-navigation accessibility
   - Reduced-motion support
   - Page-load state
   - Dynamic content support
   - Browser diagnostics

   SCRIPT ORDER
   <script src="imageData.js" defer></script>
   <script src="script.js" defer></script>

   ========================================================= */

(function () {
    "use strict";

    const AVERRA = window.AVERRA || {};

    AVERRA.version = "3.0";

    const CONFIG = {
        mobileBreakpoint: 900,
        headerScrollThreshold: 20,
        backToTopThreshold: 500,
        imageErrorClass: "image-error",
        errorClass: "field-error"
    };

    const reducedMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

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

    function prefersReducedMotion() {
        return Boolean(reducedMotion && reducedMotion.matches);
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

    function requestFrame(callback) {
        if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(callback);
        } else {
            callback();
        }
    }

    /* =====================================================
       1. MOBILE NAVIGATION
       ===================================================== */

    function initializeMobileNavigation() {
        const menuButton = select(".mobile-menu-button");

        const navigation = select(
            ".main-nav, #main-navigation"
        );

        if (!menuButton || !navigation) {
            return;
        }

        if (!navigation.id) {
            navigation.id = "main-navigation";
        }

        menuButton.setAttribute(
            "aria-controls",
            navigation.id
        );

        if (!menuButton.hasAttribute("aria-expanded")) {
            menuButton.setAttribute("aria-expanded", "false");
        }

        const isMobile = function () {
            return window.innerWidth <= CONFIG.mobileBreakpoint;
        };

        const isOpen = function () {
            return navigation.classList.contains("active");
        };

        function updateButton(open) {
            menuButton.setAttribute(
                "aria-expanded",
                String(open)
            );

            menuButton.setAttribute(
                "aria-label",
                open
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );

            menuButton.setAttribute(
                "title",
                open
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );
        }

        function openMenu() {
            if (!isMobile()) {
                return;
            }

            navigation.classList.add("active");
            document.body.classList.add("menu-open");
            updateButton(true);
        }

        function closeMenu(returnFocus) {
            navigation.classList.remove("active");
            document.body.classList.remove("menu-open");
            updateButton(false);

            if (returnFocus && isMobile()) {
                safeFocus(menuButton);
            }
        }

        function toggleMenu() {
            if (isOpen()) {
                closeMenu(false);
            } else {
                openMenu();
            }
        }

        menuButton.addEventListener("click", function (event) {
            event.preventDefault();
            toggleMenu();
        });

        navigation.addEventListener("click", function (event) {
            const link = event.target.closest("a");

            if (!link) {
                return;
            }

            if (isMobile()) {
                closeMenu(false);
            }
        });

        document.addEventListener("click", function (event) {
            if (!isMobile() || !isOpen()) {
                return;
            }

            if (
                navigation.contains(event.target) ||
                menuButton.contains(event.target)
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

        let resizeFrame = false;

        window.addEventListener("resize", function () {
            if (resizeFrame) {
                return;
            }

            resizeFrame = true;

            requestFrame(function () {
                if (!isMobile()) {
                    closeMenu(false);
                }

                resizeFrame = false;
            });
        }, { passive: true });

        updateButton(isOpen());
    }

    /* =====================================================
       2. ACTIVE NAVIGATION
       ===================================================== */

    function normalizePath(path) {
        let normalized = path || "/";

        try {
            normalized = decodeURIComponent(normalized);
        } catch (error) {
            // Keep the original path if decoding fails.
        }

        normalized = normalized.replace(/\/+$/, "");

        if (!normalized) {
            return "/";
        }

        return normalized;
    }

    function pageKey(path) {
        const normalized = normalizePath(path);
        const lastPart = normalized.split("/").pop();

        if (
            !lastPart ||
            lastPart.toLowerCase() === "index" ||
            lastPart.toLowerCase() === "index.html"
        ) {
            return "index.html";
        }

        return lastPart.toLowerCase();
    }

    function initializeActiveNavigation() {
        const links = selectAll(
            ".main-nav a[href], #main-navigation a[href]"
        );

        if (!links.length) {
            return;
        }

        const currentPage = pageKey(
            window.location.pathname
        );

        links.forEach(function (link) {
            let url;

            try {
                url = new URL(
                    link.getAttribute("href"),
                    window.location.href
                );
            } catch (error) {
                return;
            }

            if (url.origin !== window.location.origin) {
                return;
            }

            const matches =
                pageKey(url.pathname) === currentPage;

            link.classList.toggle("active", matches);

            if (matches) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    /* =====================================================
       3. HEADER SCROLL EFFECT
       ===================================================== */

    function initializeHeaderScroll() {
        const header = select(".site-header");

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

        window.addEventListener(
            "scroll",
            scheduleUpdate,
            { passive: true }
        );
    }

    /* =====================================================
       4. SAME-PAGE ANCHOR NAVIGATION
       ===================================================== */

    function initializeSmoothScrolling() {
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

            if (!link) {
                return;
            }

            if (
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
                url = new URL(href, window.location.href);
            } catch (error) {
                return;
            }

            if (
                url.origin !== window.location.origin ||
                url.pathname !== window.location.pathname ||
                !url.hash
            ) {
                return;
            }

            let targetId;

            try {
                targetId = decodeURIComponent(
                    url.hash.slice(1)
                );
            } catch (error) {
                return;
            }

            const target = document.getElementById(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            const header = select(".site-header");

            const headerHeight = header
                ? header.getBoundingClientRect().height
                : 0;

            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                headerHeight -
                16;

            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: prefersReducedMotion()
                    ? "auto"
                    : "smooth"
            });

            if (window.location.hash !== url.hash) {
                window.history.pushState(
                    null,
                    "",
                    url.hash
                );
            }

            /*
             * Add tabindex only when necessary and restore
             * the original state after focus leaves the target.
             */

            const needsTemporaryTabindex =
                !target.hasAttribute("tabindex") &&
                !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(
                    target.tagName
                );

            if (needsTemporaryTabindex) {
                target.setAttribute("tabindex", "-1");

                target.addEventListener("blur", function restore() {
                    target.removeAttribute("tabindex");
                    target.removeEventListener("blur", restore);
                });
            }

            safeFocus(target);
        });
    }

    /* =====================================================
       5. BACK-TO-TOP BUTTON
       ===================================================== */

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

        if (!button.hasAttribute("aria-label")) {
            button.setAttribute("aria-label", "Back to top");
        }

        let scheduled = false;

        function updateVisibility() {
            const visible =
                window.scrollY > CONFIG.backToTopThreshold;

            button.classList.toggle("visible", visible);
            button.hidden = !visible;
            scheduled = false;
        }

        function scheduleUpdate() {
            if (scheduled) {
                return;
            }

            scheduled = true;
            requestFrame(updateVisibility);
        }

        button.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion()
                    ? "auto"
                    : "smooth"
            });
        });

        window.addEventListener(
            "scroll",
            scheduleUpdate,
            { passive: true }
        );

        updateVisibility();
    }

    /* =====================================================
       6. COPYRIGHT YEAR
       ===================================================== */

    function initializeCurrentYear() {
        const year = String(new Date().getFullYear());

        selectAll(
            ".current-year, [data-current-year]"
        ).forEach(function (element) {
            element.textContent = year;
        });
    }

    /* =====================================================
       7. EXTERNAL LINKS
       ===================================================== */

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
                url = new URL(href, window.location.href);
            } catch (error) {
                return;
            }

            if (
                url.protocol !== "https:" &&
                url.protocol !== "http:"
            ) {
                return;
            }

            if (url.origin === window.location.origin) {
                return;
            }

            /*
             * Respect the HTML author's target choice.
             * Secure links that already open a new tab.
             */

            if (link.target !== "_blank") {
                return;
            }

            const relTokens = new Set(
                (link.getAttribute("rel") || "")
                    .split(/\s+/)
                    .filter(Boolean)
            );

            relTokens.add("noopener");
            relTokens.add("noreferrer");

            link.setAttribute(
                "rel",
                Array.from(relTokens).join(" ")
            );
        });
    }

    /* =====================================================
       8. FORM ERROR HELPERS
       ===================================================== */

    function getFieldErrorId(field) {
        if (!field.id) {
            const name = (field.name || "field")
                .replace(/[^a-zA-Z0-9_-]/g, "-");

            field.id = "averra-" + name + "-" +
                Math.random().toString(36).slice(2, 8);
        }

        return field.id + "-error";
    }

    function showFieldError(field, message) {
        const errorId = getFieldErrorId(field);

        field.setAttribute("aria-invalid", "true");

        let error = document.getElementById(errorId);

        if (!error) {
            error = document.createElement("div");
            error.id = errorId;
            error.className = CONFIG.errorClass;
            error.setAttribute("role", "alert");

            const container =
                field.closest(".form-group, .form-field") ||
                field.parentElement;

            if (container) {
                container.appendChild(error);
            }
        }

        error.textContent = message;

        const describedBy = new Set(
            (field.getAttribute("aria-describedby") || "")
                .split(/\s+/)
                .filter(Boolean)
        );

        describedBy.add(errorId);

        field.setAttribute(
            "aria-describedby",
            Array.from(describedBy).join(" ")
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

    function getRequiredRadioGroups(form) {
        const groups = new Map();

        selectAll('input[type="radio"][required]', form)
            .forEach(function (radio) {
                if (!radio.name) {
                    return;
                }

                if (!groups.has(radio.name)) {
                    groups.set(radio.name, []);
                }

                groups.get(radio.name).push(radio);
            });

        return groups;
    }

    /* =====================================================
       9. FORM VALIDATION
       ===================================================== */

    function validateForm(form) {
        let valid = true;
        let firstInvalid = null;

        const fields = selectAll(
            "input, textarea, select",
            form
        );

        fields.forEach(function (field) {
            clearFieldError(field);
        });

        const radioGroups = getRequiredRadioGroups(form);

        radioGroups.forEach(function (radios) {
            const checked = radios.some(function (radio) {
                return radio.checked;
            });

            if (!checked) {
                showFieldError(
                    radios[0],
                    "Please select an option."
                );

                valid = false;

                if (!firstInvalid) {
                    firstInvalid = radios[0];
                }
            }
        });

        fields.forEach(function (field) {
            if (
                field.disabled ||
                field.type === "radio" ||
                !field.required
            ) {
                return;
            }

            let fieldValid = true;
            let message = "This field is required.";

            if (field.type === "checkbox") {
                fieldValid = field.checked;
                message = "Please tick this checkbox.";
            } else {
                fieldValid =
                    String(field.value || "").trim() !== "";
            }

            if (!fieldValid) {
                showFieldError(field, message);
                valid = false;

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }
        });

        fields.forEach(function (field) {
            if (
                field.disabled ||
                field.type === "radio" ||
                field.type === "checkbox" ||
                field.value === ""
            ) {
                return;
            }

            if (!field.validity.valid) {
                let message = "Please check this field.";

                if (
                    field.validity.typeMismatch &&
                    field.type === "email"
                ) {
                    message = "Please enter a valid email address.";
                } else if (field.validity.tooShort) {
                    message = "Please enter more information.";
                } else if (field.validity.tooLong) {
                    message = "Your entry is too long.";
                } else if (field.validity.patternMismatch) {
                    message = "Please use the requested format.";
                } else if (field.validity.rangeUnderflow) {
                    message = "The value is below the permitted range.";
                } else if (field.validity.rangeOverflow) {
                    message = "The value is above the permitted range.";
                }

                showFieldError(field, message);
                valid = false;

                if (!firstInvalid) {
                    firstInvalid = field;
                }
            }
        });

        if (!valid && firstInvalid) {
            safeFocus(firstInvalid);
        }

        return valid;
    }

    function restoreSubmitButtons(form) {
        selectAll(
            'button[type="submit"], input[type="submit"]',
            form
        ).forEach(function (button) {
            if (button.dataset.averraSubmitting !== "true") {
                return;
            }

            button.disabled = false;
            button.classList.remove("is-loading");

            delete button.dataset.averraSubmitting;

            if (
                button.tagName.toLowerCase() === "button" &&
                button.dataset.averraOriginalText !== undefined
            ) {
                button.textContent =
                    button.dataset.averraOriginalText;

                delete button.dataset.averraOriginalText;
            }
        });
    }

    function initializeFormValidation() {
        const forms = selectAll("form");

        forms.forEach(function (form) {
            const fields = selectAll(
                "input, textarea, select",
                form
            );

            fields.forEach(function (field) {
                ["input", "change"].forEach(function (eventName) {
                    field.addEventListener(eventName, function () {
                        if (field.type === "radio") {
                            const group = form.elements.namedItem(
                                field.name
                            );

                            if (group && typeof group.length === "number") {
                                Array.from(group).forEach(function (radio) {
                                    if (radio.type === "radio") {
                                        clearFieldError(radio);
                                    }
                                });
                            } else {
                                clearFieldError(field);
                            }

                            return;
                        }

                        if (
                            field.type === "checkbox" &&
                            field.required
                        ) {
                            if (field.checked) {
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

                /*
                 * Do not claim that a message was sent.
                 * A working form needs a real server endpoint
                 * or a connected form-processing service.
                 */

                const action = (
                    form.getAttribute("action") || ""
                ).trim();

                const isPlaceholder =
                    !action ||
                    action === "#" ||
                    /^javascript:/i.test(action);

                if (isPlaceholder) {
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
                        "This form needs to be connected to a submission service before it can send your message.";

                    return;
                }

                const submitButton = select(
                    'button[type="submit"], input[type="submit"]',
                    form
                );

                if (!submitButton) {
                    return;
                }

                if (
                    submitButton.dataset.averraSubmitting === "true"
                ) {
                    event.preventDefault();
                    return;
                }

                submitButton.dataset.averraSubmitting = "true";
                submitButton.disabled = true;
                submitButton.classList.add("is-loading");

                if (
                    submitButton.tagName.toLowerCase() === "button"
                ) {
                    submitButton.dataset.averraOriginalText =
                        submitButton.textContent;

                    submitButton.textContent = "Sending...";
                }
            });

            /*
             * Restore button state when the browser returns
             * to a page from its back-forward cache.
             */

            window.addEventListener("pageshow", function () {
                restoreSubmitButtons(form);
            });
        });
    }

    /* =====================================================
       10. IMAGE CONFIGURATION ADAPTER
       ===================================================== */

    function resolveConfiguredImage(section, key) {
        /*
         * Support common configuration interfaces without
         * requiring any one particular imageData.js format.
         *
         * Existing static src attributes remain untouched
         * when no supported configuration is available.
         */

        const root = window.AVERRA_IMAGES ||
            window.imageData ||
            window.IMAGE_DATA;

        if (typeof window.getImageByKey === "function") {
            try {
                const result = window.getImageByKey(section, key);

                if (result) {
                    return normalizeImageRecord(result);
                }
            } catch (error) {
                // Try the remaining supported interfaces.
            }
        }

        if (typeof window.getImage === "function") {
            try {
                const result = window.getImage(key);

                if (result) {
                    return normalizeImageRecord(result);
                }
            } catch (error) {
                // Try the configuration object.
            }
        }

        if (!root || typeof root !== "object") {
            return null;
        }

        let result = null;

        if (section && root[section]) {
            const sectionData = root[section];

            if (sectionData && sectionData[key]) {
                result = sectionData[key];
            }
        }

        if (!result && root[key]) {
            result = root[key];
        }

        if (!result) {
            return null;
        }

        return normalizeImageRecord(result);
    }

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

    function initializeConfiguredImages() {
        selectAll(
            "img[data-image-section][data-image-name], " +
            "img[data-image-key]"
        ).forEach(function (img) {
            let section = img.getAttribute("data-image-section");
            let key = img.getAttribute("data-image-name");

            if (!key) {
                key = img.getAttribute("data-image-key");
            }

            if (!key) {
                return;
            }

            const configured = resolveConfiguredImage(
                section,
                key
            );

            if (!configured) {
                return;
            }

            if (img.getAttribute("src") !== configured.src) {
                img.setAttribute("src", configured.src);
            }

            if (
                configured.alt &&
                !img.hasAttribute("data-preserve-alt")
            ) {
                img.alt = configured.alt;
            }
        });

        selectAll("img[data-image-logo]").forEach(function (img) {
            const configured = resolveConfiguredImage(
                "logo",
                "logo"
            );

            if (configured && configured.src) {
                img.src = configured.src;

                if (
                    configured.alt &&
                    !img.hasAttribute("data-preserve-alt")
                ) {
                    img.alt = configured.alt;
                }
            } else if (!img.hasAttribute("alt")) {
                img.alt = "AVERRA Staffing Solutions Ltd logo";
            }
        });
    }

    /* =====================================================
       11. IMAGE ERROR HANDLING
       ===================================================== */

    function initializeImageHandling() {
        function attachImageHandlers(img) {
            if (
                img.dataset.averraImageHandlers === "true"
            ) {
                return;
            }

            img.dataset.averraImageHandlers = "true";

            img.addEventListener("error", function () {
                img.classList.add(CONFIG.imageErrorClass);
                img.setAttribute("data-image-error", "true");
            });

            img.addEventListener("load", function () {
                img.classList.remove(CONFIG.imageErrorClass);
                img.removeAttribute("data-image-error");
            });

            if (img.complete && img.naturalWidth === 0 && img.src) {
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

                    selectAll("img", node).forEach(
                        attachImageHandlers
                    );
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /* =====================================================
       12. KEYBOARD ACCESSIBILITY
       ===================================================== */

    function initializeAccessibility() {
        document.addEventListener("keydown", function (event) {
            if (event.key === "Tab") {
                document.body.classList.add(
                    "keyboard-navigation"
                );
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

        function addAccessibleName(element) {
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
                element.setAttribute(
                    "aria-label",
                    image.alt.trim()
                );
            }
        }

        selectAll("button, a").forEach(addAccessibleName);
    }

    /* =====================================================
       13. PAGE LOAD STATE
       ===================================================== */

    function initializePageLoad() {
        requestFrame(function () {
            document.documentElement.classList.add(
                "page-loaded"
            );
        });
    }

    /* =====================================================
       14. REDUCED MOTION
       ===================================================== */

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

    /* =====================================================
       15. DIAGNOSTICS
       ===================================================== */

    function diagnostics() {
        const images = selectAll("img");

        const report = {
            version: AVERRA.version,
            page: window.location.pathname,
            title: document.title,
            navigationFound: Boolean(
                select(".main-nav, #main-navigation")
            ),
            mobileMenuFound: Boolean(
                select(".mobile-menu-button")
            ),
            headerFound: Boolean(select(".site-header")),
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
            formCount: selectAll("form").length,
            formsWithoutAction: selectAll("form")
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

    /* =====================================================
       16. INITIALIZE WEBSITE
       ===================================================== */

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
        initializePageLoad();
        initializeReducedMotion();

        AVERRA.diagnostics = diagnostics;

        document.documentElement.setAttribute(
            "data-averra-script",
            AVERRA.version
        );
    }

    AVERRA.initialize = initializeWebsite;
    AVERRA.diagnostics = diagnostics;

    window.AVERRA = AVERRA;

    ready(initializeWebsite);

})();