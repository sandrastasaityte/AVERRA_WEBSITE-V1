
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: frontend/images/images.js
   Version: 12.1

   FEATURES
   - Verified catalogue for image1 through image33
   - Exact filename extensions from the current inventory
   - Backwards-compatible public image helpers
   - data-image-key and data-image support
   - CSS background image support
   - Optional semantic aliases
   - Accessible alt-text defaults
   - Missing-image diagnostics
   - Catalogue validation
   - Dynamic element support through MutationObserver
   - Safe reprocessing when managed image keys change
   - No external dependencies
   ============================================================ */

(function (window, document) {
    "use strict";

    const VERSION = "12.1";
    const COMPANY = "AVERRA Staffing Solutions Ltd";

    const CONFIG = Object.freeze({
        version: VERSION,
        company: COMPANY,
        basePath: "images/",
        autoInitialise: true,
        observeNewElements: true,
        missingImageClass: "averra-image-missing",
        defaultAlt: "AVERRA Staffing Solutions Ltd",
        debug: false
    });

    /* --------------------------------------------------------
       VERIFIED IMAGE FILE CATALOGUE
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
       SEMANTIC ALIASES

       These are convenience names. They do not verify the
       actual contents of the image files.
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

    const processedImages = new WeakSet();
    const reportedFailures = new WeakMap();
    const processedBackgrounds = new WeakMap();

    let observer = null;
    let initialised = false;

    /* --------------------------------------------------------
       GENERAL HELPERS
       -------------------------------------------------------- */

    function log() {
        if (CONFIG.debug) {
            console.info("[AVERRA Images]", ...arguments);
        }
    }

    function warn() {
        console.warn("[AVERRA Images]", ...arguments);
    }

    function isElement(value) {
        return Boolean(value && value.nodeType === 1);
    }

    function normaliseKey(key) {
        return typeof key === "string" ? key.trim() : "";
    }

    function resolveKey(key) {
        const normalised = normaliseKey(key);

        if (!normalised) {
            return "";
        }

        if (Object.prototype.hasOwnProperty.call(
            IMAGE_FILES,
            normalised
        )) {
            return normalised;
        }

        if (Object.prototype.hasOwnProperty.call(
            IMAGE_ALIASES,
            normalised
        )) {
            return IMAGE_ALIASES[normalised];
        }

        return "";
    }

    function cleanBasePath(path) {
        const value = typeof path === "string"
            ? path.trim()
            : CONFIG.basePath;

        if (!value) {
            return "";
        }

        return value.endsWith("/") ? value : value + "/";
    }

    function makeImagePath(key, customBasePath) {
        const resolvedKey = resolveKey(key);

        if (!resolvedKey) {
            return "";
        }

        const basePath = customBasePath === undefined
            ? cleanBasePath(CONFIG.basePath)
            : cleanBasePath(customBasePath);

        return basePath + IMAGE_FILES[resolvedKey];
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

    function getBackgroundKey(element) {
        if (!element || !element.getAttribute) {
            return "";
        }

        return (
            element.getAttribute("data-background-image") ||
            element.getAttribute("data-bg-image") ||
            ""
        ).trim();
    }

    function isImageElement(element) {
        return Boolean(
            isElement(element) &&
            element.tagName.toLowerCase() === "img"
        );
    }

    function matchesImage(element) {
        return Boolean(
            isElement(element) &&
            element.matches &&
            element.matches("img[data-image-key], img[data-image]")
        );
    }

    function matchesBackground(element) {
        return Boolean(
            isElement(element) &&
            element.matches &&
            element.matches(
                "[data-background-image], [data-bg-image]"
            )
        );
    }

    /* --------------------------------------------------------
       STATUS AND DIAGNOSTICS
       -------------------------------------------------------- */

    function clearMissingState(element) {
        if (!element) {
            return;
        }

        element.classList.remove(CONFIG.missingImageClass);
        element.removeAttribute("data-image-error-key");
    }

    function markMissing(element, path) {
        if (!element) {
            return;
        }

        element.classList.add(CONFIG.missingImageClass);
        element.setAttribute("data-image-status", "missing");

        if (reportedFailures.get(element) !== path) {
            reportedFailures.set(element, path);

            warn(
                "Could not load image:",
                path || "(unknown path)",
                element
            );
        }
    }

    function markLoaded(element) {
        if (!element) {
            return;
        }

        clearMissingState(element);
        element.setAttribute("data-image-status", "loaded");
        reportedFailures.delete(element);
    }

    function markUnknownKey(element, key) {
        if (!element) {
            return;
        }

        element.classList.add(CONFIG.missingImageClass);
        element.setAttribute("data-image-status", "missing");

        if (element.getAttribute("data-image-error-key") !== key) {
            element.setAttribute("data-image-error-key", key);
            warn("Unknown image key:", key, element);
        }
    }

    /* --------------------------------------------------------
       PUBLIC IMAGE HELPERS
       -------------------------------------------------------- */

    function getImagePath(key, customBasePath) {
        return makeImagePath(key, customBasePath);
    }

    function getImageUrl(key, customBasePath) {
        return makeImagePath(key, customBasePath);
    }

    function getImageFilename(key) {
        const resolvedKey = resolveKey(key);

        return resolvedKey ? IMAGE_FILES[resolvedKey] : "";
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
       PROCESS IMAGE ELEMENTS
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
            markUnknownKey(element, key);
            return false;
        }

        element.removeAttribute("data-image-error-key");

        if (!element.hasAttribute("alt")) {
            element.setAttribute("alt", CONFIG.defaultAlt);
        }

        if (!processedImages.has(element)) {
            element.addEventListener("load", function () {
                const currentKey = getElementKey(element);
                const currentPath = makeImagePath(currentKey);
                const managedPath = element.getAttribute(
                    "data-image-managed-src"
                );

                if (currentPath && currentPath === managedPath) {
                    markLoaded(element);
                }
            });

            element.addEventListener("error", function () {
                const currentKey = getElementKey(element);
                const currentPath = makeImagePath(currentKey);
                const managedPath = element.getAttribute(
                    "data-image-managed-src"
                );

                if (currentPath && currentPath === managedPath) {
                    markMissing(element, managedPath);
                }
            });

            processedImages.add(element);
        }

        const previousPath = element.getAttribute(
            "data-image-managed-src"
        );

        if (previousPath !== path) {
            clearMissingState(element);

            element.setAttribute("data-image-status", "loading");
            element.setAttribute("data-image-managed-src", path);
            element.setAttribute("src", path);

            return true;
        }

        if (
            element.complete &&
            element.naturalWidth === 0
        ) {
            markMissing(element, path);
        } else if (
            element.complete &&
            element.naturalWidth > 0
        ) {
            markLoaded(element);
        }

        return true;
    }

    /* --------------------------------------------------------
       PROCESS CSS BACKGROUND ELEMENTS
       -------------------------------------------------------- */

    function processBackgroundElement(element) {
        if (!isElement(element)) {
            return false;
        }

        const key = getBackgroundKey(element);

        if (!key) {
            return false;
        }

        const path = makeImagePath(key);

        if (!path) {
            markUnknownKey(element, key);
            return false;
        }

        element.removeAttribute("data-image-error-key");

        const previousPath = processedBackgrounds.get(element);

        if (previousPath === path) {
            return true;
        }

        processedBackgrounds.set(element, path);
        clearMissingState(element);

        element.style.backgroundImage =
            'url("' +
            path.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
            '")';

        element.setAttribute("data-image-status", "loading");

        const probe = new window.Image();

        probe.onload = function () {
            if (processedBackgrounds.get(element) === path) {
                clearMissingState(element);
                element.setAttribute("data-image-status", "loaded");
            }
        };

        probe.onerror = function () {
            if (processedBackgrounds.get(element) === path) {
                markMissing(element, path);
            }
        };

        probe.src = path;

        return true;
    }

    /* --------------------------------------------------------
       INITIALISE IMAGE ELEMENTS
       -------------------------------------------------------- */

    function initialiseImages(root) {
        const container = root || document;

        if (
            container.nodeType !== 1 &&
            container.nodeType !== 9 &&
            container.nodeType !== 11
        ) {
            warn("Invalid root passed to initialiseImages().");
            return 0;
        }

        let processedCount = 0;

        if (matchesImage(container)) {
            if (processImageElement(container)) {
                processedCount++;
            }
        }

        if (matchesBackground(container)) {
            if (processBackgroundElement(container)) {
                processedCount++;
            }
        }

        if (container.querySelectorAll) {
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
        }

        log("Processed elements:", processedCount);

        return processedCount;
    }

    /* --------------------------------------------------------
       DYNAMIC ELEMENT OBSERVER
       -------------------------------------------------------- */

    function observeNewElements() {
        if (
            !CONFIG.observeNewElements ||
            typeof window.MutationObserver === "undefined" ||
            !document.body
        ) {
            return;
        }

        if (observer) {
            observer.disconnect();
        }

        observer = new window.MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    const element = mutation.target;

                    if (matchesImage(element)) {
                        processImageElement(element);
                    } else if (matchesBackground(element)) {
                        processBackgroundElement(element);
                    }

                    return;
                }

                mutation.addedNodes.forEach(function (node) {
                    if (isElement(node)) {
                        initialiseImages(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "data-image-key",
                "data-image",
                "data-background-image",
                "data-bg-image"
            ]
        });
    }

    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    /* --------------------------------------------------------
       CATALOGUE VALIDATION
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

        Object.keys(IMAGE_ALIASES).forEach(function (alias) {
            if (!Object.prototype.hasOwnProperty.call(
                IMAGE_FILES,
                IMAGE_ALIASES[alias]
            )) {
                problems.push(
                    "Alias points to an unknown image: " + alias
                );
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
                key:
                    getElementKey(element) ||
                    getBackgroundKey(element) ||
                    "",
                source:
                    element.getAttribute("data-image-managed-src") ||
                    element.style.backgroundImage ||
                    element.currentSrc ||
                    element.src ||
                    "",
                status: element.getAttribute("data-image-status"),
                element: element
            };
        });
    }

    function auditImages() {
        const catalogue = validateImageCatalogue();

        const report = {
            company: COMPANY,
            version: VERSION,
            catalogueCount: getImageCount(),
            catalogueValid: catalogue.valid,
            catalogueProblems: catalogue.problems,
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

        if (catalogue.problems.length) {
            console.warn(
                "Catalogue problems:",
                catalogue.problems
            );
        }

        if (report.missingImages.length) {
            console.warn(
                "Images that need checking:",
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
       -------------------------------------------------------- */

    const publicAPI = Object.freeze({
        version: VERSION,
        company: COMPANY,
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
    window.AVERRAImageManager = publicAPI;

    // Preserve helper functions if another script already owns them.
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
