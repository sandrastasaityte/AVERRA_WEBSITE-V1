
/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: images.js
   Version: 8.0
   ============================================================

   FEATURES
   - Supports image1 through image33
   - Tries common image file extensions automatically
   - Central image catalogue and aliases
   - Supports existing data-image-key attributes
   - Supports image elements and background images
   - Provides backwards-compatible helper functions
   - Handles missing images gracefully
   - Provides image inventory and diagnostic functions
   - Does not rename or delete files

   IMPORTANT
   Keep all numbered images in the images/ folder.
   The image number mapping below assumes image1 is your
   logo, image2 is your homepage hero, and so on.
   Adjust the mapping if your original order differs.
   ============================================================ */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       1. CONFIGURATION
       --------------------------------------------------------- */

    const CONFIG = {
        version: "8.0",
        imageFolder: "images/",
        totalImages: 33,

        // Change to true to print diagnostic messages.
        debug: false,

        // Common image extensions tried in this order.
        extensions: [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".avif",
            ".gif"
        ],

        missingImageClass: "averra-image-missing",
        backgroundAttribute: "data-image-background"
    };

    /* ---------------------------------------------------------
       2. NUMBERED IMAGE CATALOGUE

       Change the number assigned to a key if your original
       image order uses a different arrangement.
       --------------------------------------------------------- */

    const IMAGE_CATALOG = {
        logo: 1,

        "hero-global-talent": 2,
        "home-hero": 2,
        "hero-home": 2,

        "about-global-network": 3,
        "about-team": 3,

        "about-uk-india": 4,
        "uk-india": 4,

        "business-professionals": 5,
        "professional-team": 5,

        "career-global-opportunities": 6,
        "careers-hero": 6,

        "frequent-questions": 7,
        "faq-hero": 7,

        locations: 8,
        "global-locations": 8,

        "virtual-office": 9,
        "virtual-office-team": 9,

        office: 10,
        "office-team": 10,

        "meetings-professional": 11,
        meetings: 11,

        "virtual-calls": 12,
        "virtual-meetings": 12,

        "services-hero": 13,
        "outsourcing-services": 14,
        "finance-services": 15,
        "technology-services": 16,
        "customer-support": 17,
        "virtual-assistant": 18,
        recruitment: 19,
        "how-it-works": 20,
        "working-process": 21,
        "global-workforce": 22,
        "india-workforce": 23,
        "business-growth": 24,
        "remote-working": 25,
        "careers-team": 26,
        "jobs-hero": 27,
        "jobs-finance": 28,
        "jobs-development": 29,
        "contact-hero": 30,
        "contact-team": 31,
        "business-partnership": 32,
        "footer-background": 33
    };

    /* ---------------------------------------------------------
       3. BACKWARDS-COMPATIBLE ALIASES

       Existing HTML can continue using these older names.
       --------------------------------------------------------- */

    const ALIASES = {
        homepage: "home-hero",
        hero: "hero-global-talent",
        "global-talent": "hero-global-talent",
        "global-network": "about-global-network",
        "uk-india-connection": "about-uk-india",
        "business-professional": "business-professionals",
        careers: "career-global-opportunities",
        jobs: "jobs-hero",
        faq: "frequent-questions",
        "virtuals-calls": "virtual-calls",
        "professional-meetings": "meetings-professional",
        "office-image": "office",
        "logo-image": "logo"
    };

    /* ---------------------------------------------------------
       4. INTERNAL UTILITIES
       --------------------------------------------------------- */

    const extensionCache = Object.create(null);
    const imageElementState = new WeakMap();
    const backgroundElementState = new WeakMap();

    function log(...args) {
        if (CONFIG.debug && window.console) {
            console.log("[AVERRA Images]", ...args);
        }
    }

    function warn(...args) {
        if (window.console) {
            console.warn("[AVERRA Images]", ...args);
        }
    }

    function normaliseKey(key) {
        return String(key || "")
            .trim()
            .toLowerCase()
            .replace(/\\/g, "/")
            .replace(/\s+/g, "-")
            .replace(/_/g, "-");
    }

    function normaliseFolder(folder) {
        let value = String(folder || CONFIG.imageFolder).trim();

        if (!value) {
            value = "images/";
        }

        if (!value.endsWith("/")) {
            value += "/";
        }

        return value;
    }

    function resolveAlias(key) {
        let current = normaliseKey(key);
        const visited = new Set();

        while (ALIASES[current] && !visited.has(current)) {
            visited.add(current);
            current = normaliseKey(ALIASES[current]);
        }

        return current;
    }

    function getImageNumber(key) {
        const resolved = resolveAlias(key);

        if (
            Object.prototype.hasOwnProperty.call(
                IMAGE_CATALOG,
                resolved
            )
        ) {
            return IMAGE_CATALOG[resolved];
        }

        // Allow direct keys such as image1, image2, image33.
        const directMatch = resolved.match(/^image(\d{1,2})$/);

        if (directMatch) {
            const number = Number(directMatch[1]);

            if (number >= 1 && number <= CONFIG.totalImages) {
                return number;
            }
        }

        // Allow numeric keys such as "1", "2", "33".
        if (/^\d{1,2}$/.test(resolved)) {
            const number = Number(resolved);

            if (number >= 1 && number <= CONFIG.totalImages) {
                return number;
            }
        }

        return null;
    }

    function getExtensionFromPath(path) {
        const match = String(path || "").match(
            /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i
        );

        return match ? "." + match[1].toLowerCase() : null;
    }

    function makeNumberedPath(number, extension, folder) {
        return (
            normaliseFolder(folder) +
            "image" +
            number +
            extension
        );
    }

    /* ---------------------------------------------------------
       5. IMAGE PATH HELPERS

       getImagePath("logo") -> "images/image1.jpg"
       getImagePath("image12") -> "images/image12.jpg"

       The default extension is .jpg. If your file has another
       extension, the loader will try the alternatives.
       --------------------------------------------------------- */

    function getImagePath(key, options) {
        const settings = options || {};
        const number = getImageNumber(key);

        if (number === null) {
            warn("Unknown image key:", key);
            return null;
        }

        const extension = settings.extension || ".jpg";
        const folder = settings.folder || CONFIG.imageFolder;

        return makeNumberedPath(number, extension, folder);
    }

    function getImageUrl(key, options) {
        return getImagePath(key, options);
    }

    /* ---------------------------------------------------------
       6. IMAGE EXTENSION FALLBACK

       Browsers cannot list files in your folder automatically.
       This loader tries common extensions one by one until
       the image loads successfully.
       --------------------------------------------------------- */

    function createImageCandidates(number, folder, preferredExtension) {
        const extensions = [];

        if (preferredExtension) {
            const preferred = preferredExtension.startsWith(".")
                ? preferredExtension
                : "." + preferredExtension;

            extensions.push(preferred.toLowerCase());
        }

        CONFIG.extensions.forEach(function (extension) {
            if (!extensions.includes(extension)) {
                extensions.push(extension);
            }
        });

        return extensions.map(function (extension) {
            return makeNumberedPath(number, extension, folder);
        });
    }

    function loadNumberedImage(element, number, options) {
        const settings = options || {};
        const folder = settings.folder || CONFIG.imageFolder;
        const preferredExtension = settings.extension || null;
        const candidates = createImageCandidates(
            number,
            folder,
            preferredExtension
        );

        let candidateIndex = 0;

        const previousState = imageElementState.get(element);

        if (previousState && previousState.cleanup) {
            previousState.cleanup();
        }

        const state = {
            number: number,
            candidates: candidates,
            index: 0,
            cleanup: null
        };

        imageElementState.set(element, state);

        function tryNextCandidate() {
            if (candidateIndex >= candidates.length) {
                element.classList.add(CONFIG.missingImageClass);
                element.dataset.imageStatus = "missing";

                element.removeEventListener("error", handleError);
                element.removeEventListener("load", handleLoad);

                warn(
                    "Could not load image" + number +
                    ". Check the filename and extension.",
                    candidates
                );

                return;
            }

            const path = candidates[candidateIndex];
            candidateIndex += 1;
            state.index = candidateIndex;

            element.src = path;
            log("Trying image:", path);
        }

        function handleError() {
            tryNextCandidate();
        }

        function handleLoad() {
            element.classList.remove(CONFIG.missingImageClass);
            element.dataset.imageStatus = "loaded";
            element.dataset.imageResolved = element.currentSrc ||
                element.src;

            log("Loaded image:", element.dataset.imageResolved);
        }

        element.addEventListener("error", handleError);
        element.addEventListener("load", handleLoad);

        state.cleanup = function () {
            element.removeEventListener("error", handleError);
            element.removeEventListener("load", handleLoad);
        };

        tryNextCandidate();
    }

    /* ---------------------------------------------------------
       7. APPLY IMAGES TO HTML ELEMENTS
       --------------------------------------------------------- */

    function applyImage(element, key, options) {
        if (!element || !key) {
            return false;
        }

        const number = getImageNumber(key);

        if (number === null) {
            warn("No image mapping found for key:", key);
            element.dataset.imageStatus = "unmapped";
            return false;
        }

        // Preserve accessibility: do not overwrite an existing alt.
        if (element.tagName === "IMG") {
            if (!element.hasAttribute("alt")) {
                element.alt = "";
            }

            element.dataset.imageNumber = String(number);

            loadNumberedImage(element, number, options);
            return true;
        }

        return applyBackground(element, key, options);
    }

    /* ---------------------------------------------------------
       8. BACKGROUND IMAGE SUPPORT
       --------------------------------------------------------- */

    function applyBackground(element, key, options) {
        if (!element || !key) {
            return false;
        }

        const number = getImageNumber(key);

        if (number === null) {
            warn("No background image mapping found:", key);
            return false;
        }

        const settings = options || {};
        const candidates = createImageCandidates(
            number,
            settings.folder || CONFIG.imageFolder,
            settings.extension || null
        );

        const previousState = backgroundElementState.get(element);

        if (previousState && previousState.cancelled) {
            previousState.cancelled = true;
        }

        const state = {
            cancelled: false,
            index: 0
        };

        backgroundElementState.set(element, state);

        function tryNext() {
            if (state.cancelled || state.index >= candidates.length) {
                if (!state.cancelled) {
                    element.classList.add(CONFIG.missingImageClass);
                    element.dataset.imageStatus = "missing";

                    warn("Could not load background image:", number);
                }

                return;
            }

            const path = candidates[state.index];
            state.index += 1;

            const testImage = new Image();

            testImage.onload = function () {
                if (state.cancelled) {
                    return;
                }

                element.style.backgroundImage =
                    'url("' + path.replace(/"/g, '\\"') + '")';

                element.classList.remove(CONFIG.missingImageClass);
                element.dataset.imageStatus = "loaded";
                element.dataset.imageResolved = path;

                log("Loaded background:", path);
            };

            testImage.onerror = tryNext;
            testImage.src = path;
        }

        tryNext();
        return true;
    }

    /* ---------------------------------------------------------
       9. AUTOMATIC PAGE SCAN

       Supported examples:

       <img data-image-key="hero-global-talent" alt="...">

       <div data-image-background="about-global-network"></div>

       <div data-image-key="about-uk-india"></div>
       --------------------------------------------------------- */

    function scanImages(root) {
        const scope = root || document;

        const imageElements = scope.querySelectorAll(
            "img[data-image-key], img[data-image-number]"
        );

        imageElements.forEach(function (element) {
            if (element.dataset.averraImageProcessed === "true") {
                return;
            }

            const key = element.dataset.imageKey ||
                element.dataset.imageNumber;

            if (!key) {
                return;
            }

            element.dataset.averraImageProcessed = "true";
            applyImage(element, key);
        });

        const backgroundElements = scope.querySelectorAll(
            "[data-image-background], [data-image-key].averra-background"
        );

        backgroundElements.forEach(function (element) {
            if (element.dataset.averraBackgroundProcessed === "true") {
                return;
            }

            const key = element.dataset.imageBackground ||
                element.dataset.imageKey;

            if (!key) {
                return;
            }

            element.dataset.averraBackgroundProcessed = "true";
            applyBackground(element, key);
        });
    }

    /* ---------------------------------------------------------
       10. IMAGE INVENTORY AND DIAGNOSTICS
       --------------------------------------------------------- */

    function getImageInventory() {
        const inventory = [];

        for (let number = 1; number <= CONFIG.totalImages; number += 1) {
            inventory.push({
                number: number,
                key: "image" + number,
                path: makeNumberedPath(
                    number,
                    ".jpg",
                    CONFIG.imageFolder
                ),
                alternatives: CONFIG.extensions.slice()
            });
        }

        return inventory;
    }

    function getCatalogue() {
        return Object.assign({}, IMAGE_CATALOG);
    }

    function auditImages() {
        const report = {
            version: CONFIG.version,
            folder: CONFIG.imageFolder,
            expectedImages: CONFIG.totalImages,
            mappings: [],
            unmappedElements: [],
            missingImages: []
        };

        document.querySelectorAll(
            "[data-image-key], [data-image-background]"
        ).forEach(function (element) {
            const key = element.dataset.imageKey ||
                element.dataset.imageBackground;

            const number = getImageNumber(key);

            report.mappings.push({
                key: key,
                number: number,
                tag: element.tagName,
                status: element.dataset.imageStatus || "not-tested"
            });

            if (number === null) {
                report.unmappedElements.push(key);
            }

            if (element.dataset.imageStatus === "missing") {
                report.missingImages.push(key);
            }
        });

        log("Image audit:", report);
        return report;
    }

    function refreshImages(root) {
        const scope = root || document;

        scope.querySelectorAll(
            "[data-image-key], [data-image-background]"
        ).forEach(function (element) {
            delete element.dataset.averraImageProcessed;
            delete element.dataset.averraBackgroundProcessed;
            delete element.dataset.imageStatus;
            delete element.dataset.imageResolved;
        });

        scanImages(scope);
    }

    /* ---------------------------------------------------------
       11. PUBLIC API
       --------------------------------------------------------- */

    const AVERRAImages = {
        version: CONFIG.version,
        config: CONFIG,
        catalogue: IMAGE_CATALOG,
        aliases: ALIASES,

        getImagePath: getImagePath,
        getImageUrl: getImageUrl,
        getImageNumber: getImageNumber,
        applyImage: applyImage,
        applyBackground: applyBackground,
        scanImages: scanImages,
        refreshImages: refreshImages,
        getImageInventory: getImageInventory,
        getCatalogue: getCatalogue,
        auditImages: auditImages
    };

    // Main public API.
    window.AVERRAImages = AVERRAImages;

    // Compatibility aliases for older website scripts.
    window.AVERRA_IMAGE_CATALOG = IMAGE_CATALOG;
    window.AVERRA_IMAGE_CONFIG = CONFIG;
    window.getImagePath = getImagePath;
    window.getImageUrl = getImageUrl;
    window.getAVERRAImage = getImageUrl;
    window.getImageInventory = getImageInventory;
    window.auditAVERRAImages = auditImages;
    window.refreshAVERRAImages = refreshImages;

    /* ---------------------------------------------------------
       12. STARTUP
       --------------------------------------------------------- */

    function initialise() {
        scanImages(document);

        log(
            "Image management system ready.",
            "Version:",
            CONFIG.version,
            "Images:",
            CONFIG.totalImages
        );
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
