"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: images.js
   Version: 10.0
   ============================================================

   FEATURES
   - Exact catalogue for image1 through image33
   - Correct JPG, PNG and JPEG extensions
   - Backwards-compatible public image helpers
   - Supports data-image-key attributes
   - Supports image elements and CSS backgrounds
   - Optional image aliases for website sections
   - Accessible image alt-text defaults
   - Missing-image detection and diagnostics
   - Image inventory and validation helpers
   - Optional automatic processing of added elements
   - Safe DOM updates without external dependencies

   EXPECTED STRUCTURE

   AVERRA_WEBSITE_v1/
   |-- index.html
   |-- about.html
   |-- services.html
   |-- careers.html
   |-- style.css
   |-- script.js
   |-- images.js
   |-- images/
       |-- image1.jpg
       |-- image2.jpg
       |-- ...
       |-- image33.jpg

   IMPORTANT
   This file manages images only. Job listings and applications
   remain in jobs.js and are not stored in this catalogue.
   ============================================================ */

(function (window, document) {
    "use strict";

    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = Object.freeze({
        version: "10.0",
        company: "AVERRA Staffing Solutions Ltd",

        /*
         * Relative to the webpage URL.
         * Change this only if your images folder is elsewhere.
         */
        basePath: "images/",

        /*
         * Automatically process elements marked with
         * data-image-key when the page loads.
         */
        autoInitialise: true,

        /*
         * Process new data-image-key elements added to the page.
         */
        observeNewElements: true,

        /*
         * Add a CSS class when an image cannot be loaded.
         */
        missingImageClass: "averra-image-missing",

        /*
         * Use this alt text only when an image has no alt attribute.
         */
        defaultAlt: "AVERRA Staffing Solutions Ltd"
    });

    /* --------------------------------------------------------
       EXACT IMAGE FILE CATALOGUE

       Filenames and extensions match the supplied file list.
       Do not rename these files unless you update this catalogue.
       -------------------------------------------------------- */

    const IMAGE_FILES = Object.freeze({
        image1: "image1.jpg",
        image2: "image2.jpg",
        image3: "image3.jpg",
        image4: "image4.jpg",
        image5: "image5.jpg",
        image6: "image6.jpg",
        image7: "image7.jpg",
        image8: "image8.png",
        image9: "image9.png",
        image10: "image10.png",
        image11: "image11.png",
        image12: "image12.jpg",
        image13: "image13.jpg",
        image14: "image14.jpg",
        image15: "image15.jpg",
        image16: "image16.png",
        image17: "image17.jpg",
        image18: "image18.jpg",
        image19: "image19.jpg",
        image20: "image20.jpeg",
        image21: "image21.jpg",
        image22: "image22.png",
        image23: "image23.png",
        image24: "image24.png",
        image25: "image25.jpg",
        image26: "image26.jpg",
        image27: "image27.png",
        image28: "image28.jpg",
        image29: "image29.jpg",
        image30: "image30.jpg",
        image31: "image31.png",
        image32: "image32.jpg",
        image33: "image33.jpg"
    });

    /* --------------------------------------------------------
       OPTIONAL SECTION ALIASES

       These aliases are convenience names, not claims about
       the actual contents of your image files.

       Adjust the mappings after reviewing your images.
       -------------------------------------------------------- */

    const IMAGE_ALIASES = Object.freeze({
        hero: "image1",
        homepageHero: "image1",
        about: "image2",
        aboutUs: "image2",
        services: "image3",
        globalTalent: "image4",
        ukIndia: "image5",
        businessProfessionals: "image6",
        careers: "image7",
        jobs: "image8",
        finance: "image9",
        technology: "image10",
        administration: "image11",
        recruitment: "image12",
        customerSupport: "image13",
        marketing: "image14",
        remoteWorking: "image15",
        team: "image16",
        office: "image17",
        virtualAssistant: "image18",
        contact: "image19",
        opportunities: "image20",
        professionalServices: "image21",
        development: "image22",
        financeServices: "image23",
        globalOpportunities: "image24",
        businessSupport: "image25",
        collaboration: "image26",
        digitalServices: "image27",
        remoteTeam: "image28",
        workplace: "image29",
        globalNetwork: "image30",
        businessMeeting: "image31",
        professionalTeam: "image32",
        footer: "image33"
    });

    /* --------------------------------------------------------
       INTERNAL UTILITIES
       -------------------------------------------------------- */

    const processedElements = new WeakSet();
    const failedElements = new WeakSet();

    let observer = null;
    let initialised = false;

    function normaliseKey(key) {
        if (typeof key !== "string") {
            return "";
        }

        return key.trim();
    }

    function resolveKey(key) {
        const normalised = normaliseKey(key);

        if (!normalised) {
            return "";
        }

        if (
            Object.prototype.hasOwnProperty.call(
                IMAGE_FILES,
                normalised
            )
        ) {
            return normalised;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                IMAGE_ALIASES,
                normalised
            )
        ) {
            return IMAGE_ALIASES[normalised];
        }

        return "";
    }

    function cleanBasePath(path) {
        const value =
            typeof path === "string"
                ? path.trim()
                : CONFIG.basePath;

        if (!value) {
            return "";
        }

        return value.endsWith("/") ? value : value + "/";
    }

    function getCurrentBasePath() {
        return cleanBasePath(CONFIG.basePath);
    }

    function makeImagePath(key, customBasePath) {
        const resolvedKey = resolveKey(key);

        if (!resolvedKey) {
            return "";
        }

        const basePath =
            customBasePath === undefined
                ? getCurrentBasePath()
                : cleanBasePath(customBasePath);

        return basePath + IMAGE_FILES[resolvedKey];
    }

    function isImageElement(element) {
        return Boolean(
            element &&
            element.nodeType === 1 &&
            element.tagName.toLowerCase() === "img"
        );
    }

    function markMissing(element, path) {
        if (!element) {
            return;
        }

        element.classList.add(CONFIG.missingImageClass);
        element.setAttribute("data-image-status", "missing");

        failedElements.add(element);

        if (!element.hasAttribute("data-image-error-reported")) {
            element.setAttribute("data-image-error-reported", "true");

            console.warn(
                "[AVERRA Images] Could not load image:",
                path || "(unknown path)",
                element
            );
        }
    }

    function markLoaded(element) {
        if (!element) {
            return;
        }

        element.classList.remove(CONFIG.missingImageClass);
        element.setAttribute("data-image-status", "loaded");
        element.removeAttribute("data-image-error-reported");

        failedElements.delete(element);
    }

    function getElementKey(element) {
        if (!element || !element.getAttribute) {
            return "";
        }

        return (
            element.getAttribute("data-image-key") ||
            element.getAttribute("data-image") ||
            ""
        ).trim();
    }

    /* --------------------------------------------------------
       PUBLIC IMAGE HELPERS
       -------------------------------------------------------- */

    function getImagePath(key, customBasePath) {
        return makeImagePath(key, customBasePath);
    }

    /*
     * Compatibility alias for older website code that calls
     * getImageUrl() instead of getImagePath().
     */
    function getImageUrl(key, customBasePath) {
        return makeImagePath(key, customBasePath);
    }

    function getImageFilename(key) {
        const resolvedKey = resolveKey(key);

        return resolvedKey
            ? IMAGE_FILES[resolvedKey]
            : "";
    }

    function getImageKey(key) {
        return resolveKey(key);
    }

    function getImageInventory() {
        return Object.keys(IMAGE_FILES).map(function (key) {
            return {
                key: key,
                filename: IMAGE_FILES[key],
                path: makeImagePath(key),
                url: makeImagePath(key)
            };
        });
    }

    function getImageAliases() {
        return Object.assign({}, IMAGE_ALIASES);
    }

    function getImageCount() {
        return Object.keys(IMAGE_FILES).length;
    }

    function hasImage(key) {
        return Boolean(resolveKey(key));
    }

    /* --------------------------------------------------------
       PROCESS AN IMAGE ELEMENT
       -------------------------------------------------------- */

    function processImageElement(element) {
        if (!isImageElement(element)) {
            return false;
        }

        const key = getElementKey(element);

        if (!key) {
            return false;
        }

        const path = makeImagePath(key);

        if (!path) {
            markMissing(element, key);

            console.warn(
                "[AVERRA Images] Unknown image key:",
                key
            );

            return false;
        }

        if (!element.hasAttribute("alt")) {
            element.setAttribute("alt", CONFIG.defaultAlt);
        }

        /*
         * Do not repeatedly assign the same source. This helps
         * avoid unnecessary reloads when initialising repeatedly.
         */
        if (
            element.getAttribute("src") !== path &&
            element.getAttribute("data-image-managed-src") !== path
        ) {
            element.setAttribute("data-image-managed-src", path);
            element.setAttribute("src", path);
        }

        if (!processedElements.has(element)) {
            element.addEventListener("load", function () {
                markLoaded(element);
            });

            element.addEventListener("error", function () {
                markMissing(
                    element,
                    element.currentSrc || element.src || path
                );
            });

            processedElements.add(element);
        }

        /*
         * Handle images that completed loading before the
         * event listeners were attached.
         */
        if (element.complete && element.naturalWidth > 0) {
            markLoaded(element);
        } else if (element.complete && element.naturalWidth === 0) {
            markMissing(element, path);
        }

        return true;
    }

    /* --------------------------------------------------------
       PROCESS A CSS BACKGROUND ELEMENT
       -------------------------------------------------------- */

    function processBackgroundElement(element) {
        if (!element || element.nodeType !== 1) {
            return false;
        }

        const key =
            element.getAttribute("data-background-image") ||
            element.getAttribute("data-bg-image") ||
            "";

        if (!key) {
            return false;
        }

        const path = makeImagePath(key);

        if (!path) {
            element.classList.add(CONFIG.missingImageClass);

            console.warn(
                "[AVERRA Images] Unknown background image key:",
                key
            );

            return false;
        }

        element.style.backgroundImage =
            'url("' + path.replace(/"/g, '\\"') + '")';

        element.setAttribute("data-image-status", "assigned");

        return true;
    }

    /* --------------------------------------------------------
       INITIALISE A ROOT ELEMENT OR THE WHOLE PAGE
       -------------------------------------------------------- */

    function initialiseImages(root) {
        const container = root || document;

        if (
            container.nodeType !== 1 &&
            container.nodeType !== 9 &&
            container.nodeType !== 11
        ) {
            console.warn(
                "[AVERRA Images] initialiseImages() received an invalid root."
            );

            return 0;
        }

        let processedCount = 0;

        if (
            container.nodeType === 1 &&
            container.matches &&
            (
                container.matches("[data-image-key]") ||
                container.matches("[data-image]")
            )
        ) {
            if (processImageElement(container)) {
                processedCount++;
            }
        }

        if (
            container.nodeType === 1 &&
            container.matches &&
            (
                container.matches("[data-background-image]") ||
                container.matches("[data-bg-image]")
            )
        ) {
            if (processBackgroundElement(container)) {
                processedCount++;
            }
        }

        container.querySelectorAll(
            "img[data-image-key], img[data-image]"
        ).forEach(function (element) {
            if (processImageElement(element)) {
                processedCount++;
            }
        });

        container.querySelectorAll(
            "[data-background-image], [data-bg-image]"
        ).forEach(function (element) {
            if (processBackgroundElement(element)) {
                processedCount++;
            }
        });

        return processedCount;
    }

    /* --------------------------------------------------------
       OPTIONAL AUTOMATIC OBSERVER
       -------------------------------------------------------- */

    function observeNewElements() {
        if (
            !CONFIG.observeNewElements ||
            typeof MutationObserver === "undefined" ||
            !document.body
        ) {
            return;
        }

        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        initialiseImages(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    /* --------------------------------------------------------
       VALIDATION AND DIAGNOSTICS
       -------------------------------------------------------- */

    function validateImageCatalogue() {
        const inventory = getImageInventory();
        const keys = new Set();
        const filenames = new Set();
        const problems = [];

        inventory.forEach(function (item) {
            if (keys.has(item.key)) {
                problems.push("Duplicate image key: " + item.key);
            }

            if (filenames.has(item.filename)) {
                problems.push(
                    "Duplicate image filename: " + item.filename
                );
            }

            keys.add(item.key);
            filenames.add(item.filename);

            if (!item.filename) {
                problems.push("Missing filename for " + item.key);
            }
        });

        return {
            valid: problems.length === 0,
            count: inventory.length,
            problems: problems,
            inventory: inventory
        };
    }

    function getFailedImages() {
        return Array.from(
            document.querySelectorAll(
                "." + CONFIG.missingImageClass
            )
        ).map(function (element) {
            return {
                key: getElementKey(element),
                source: element.currentSrc || element.src || "",
                element: element
            };
        });
    }

    function auditImages() {
        const report = {
            company: CONFIG.company,
            version: CONFIG.version,
            catalogueCount: getImageCount(),
            catalogueValid: validateImageCatalogue().valid,
            imagesOnPage: document.querySelectorAll("img").length,
            managedImages: document.querySelectorAll(
                "img[data-image-key], img[data-image]"
            ).length,
            missingImages: getFailedImages()
        };

        console.group("[AVERRA Images] Image audit");
        console.table({
            "Catalogue entries": report.catalogueCount,
            "Catalogue valid": report.catalogueValid,
            "Images on page": report.imagesOnPage,
            "Managed images": report.managedImages,
            "Missing images": report.missingImages.length
        });

        if (report.missingImages.length > 0) {
            console.warn(
                "[AVERRA Images] Check the missing images below:",
                report.missingImages
            );
        }

        console.groupEnd();

        return report;
    }

    /* --------------------------------------------------------
       STARTUP
       -------------------------------------------------------- */

    function init() {
        if (initialised) {
            return;
        }

        initialised = true;

        if (CONFIG.autoInitialise) {
            initialiseImages(document);
        }

        observeNewElements();
    }

    /* --------------------------------------------------------
       PUBLIC API

       Available as:
       window.AVERRAImages
       window.AVERRAImageManager

       Older helper names are also exposed where possible.
       -------------------------------------------------------- */

    const publicAPI = Object.freeze({
        version: CONFIG.version,
        company: CONFIG.company,
        basePath: CONFIG.basePath,

        files: IMAGE_FILES,
        aliases: IMAGE_ALIASES,

        getImagePath: getImagePath,
        getImageUrl: getImageUrl,
        getImageFilename: getImageFilename,
        getImageKey: getImageKey,
        getImageInventory: getImageInventory,
        getImageAliases: getImageAliases,
        getImageCount: getImageCount,
        hasImage: hasImage,

        initialiseImages: initialiseImages,
        initializeImages: initialiseImages,
        init: init,

        validateImageCatalogue: validateImageCatalogue,
        getFailedImages: getFailedImages,
        auditImages: auditImages,

        stopObserving: stopObserving
    });

    window.AVERRAImages = publicAPI;

    /*
     * Compatibility alias for scripts using the alternative name.
     */
    window.AVERRAImageManager = publicAPI;

    /*
     * Compatibility helpers for older pages or scripts.
     * Existing functions are preserved rather than overwritten.
     */
    if (typeof window.getImagePath !== "function") {
        window.getImagePath = getImagePath;
    }

    if (typeof window.getImageUrl !== "function") {
        window.getImageUrl = getImageUrl;
    }

    if (typeof window.getImageInventory !== "function") {
        window.getImageInventory = getImageInventory;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
            once: true
        });
    } else {
        init();
    }
})(window, document);