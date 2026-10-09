
/* =========================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: imageData.js
   Version: 2.0
   =========================================================

   FEATURES
   - Centralised image configuration
   - Existing image filenames and object keys preserved
   - Backwards-compatible helper function names
   - Safe image path normalisation
   - Image inventory and duplicate detection
   - Browser-based image validation
   - Accurate asynchronous validation reporting
   - Promise-based validation
   - Optional fallback image support
   - Protection against repeated image errors
   - Lazy loading and asynchronous decoding
   - Accessible image metadata checks
   - Dynamic image observation
   - Console diagnostics
   - No external libraries required

   PROJECT STRUCTURE

   AVERRA_WEBSITE/
   ├── index.html
   ├── about.html
   ├── services.html
   ├── industries.html
   ├── careers.html
   ├── contact.html
   ├── pricing.html
   ├── privacy-policy.html
   ├── terms.html
   ├── imageData.js
   ├── style.css
   └── images/
       ├── Logo.jpeg
       ├── hero-global-talent.jpg
       ├── about-global-network.jpg
       ├── about-team.jpg
       ├── about-uk-india.jpg
       ├── services-finance-accounting.jpg
       ├── services-operations-admin.jpg
       ├── services-customer-support.jpg
       ├── services-sales-marketing.jpg
       ├── services-it-technology.jpg
       ├── services-engineering.jpg
       ├── services-hr-recruitment.jpg
       ├── services-dedicated-teams.jpg
       ├── industries-finance.jpg
       ├── industries-technology.jpg
       ├── industries-engineering.jpg
       ├── industries-professional-services.jpg
       ├── industries-healthcare.jpg
       ├── industries-ecommerce.jpg
       └── careers-global-opportunities.jpg

   HTML USAGE

   <script src="imageData.js" defer></script>

   IMPORTANT

   This file manages image references and browser loading.
   It does not create or download image files.

========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
========================================================= */

var AVERRA_IMAGE_CONFIG = {

    /* Website image directory. */
    imageFolder: "images/",

    /* Automatically check registered images on page load. */
    autoValidate: true,

    /* Enable diagnostic messages in the console. */
    debug: true,

    /* Log each successful validation. */
    logSuccessfulLoads: false,

    /* Optional fallback filename inside images/.
       Leave empty to disable automatic fallbacks. */
    fallbackImage: "",

    /* Prevent repeated fallback attempts. */
    errorAttribute: "data-averra-image-error-handled",

    /* Prevent duplicate error listeners. */
    listenerAttribute: "data-averra-image-listener-attached",

    /* Mark elements processed by this system. */
    processedAttribute: "data-averra-image-processed",

    /* Maximum time allowed for each image validation. */
    validationTimeout: 15000,

    /* Automatically process dynamically inserted images. */
    observeDynamicImages: true,

    /* Enable native lazy loading where appropriate. */
    enableLazyLoading: true,

    /* Default loading strategy. */
    defaultLoading: "lazy",

    /* Default image decoding strategy. */
    defaultDecoding: "async",

    /* null preserves the browser's default behaviour.
       A string such as "anonymous" can be configured. */
    crossOrigin: null

};


/* =========================================================
   2. CENTRAL IMAGE DATA
   Preserve existing filenames and keys.
========================================================= */

var imageData = {

    /* -----------------------------------------------------
       LOGO
    ----------------------------------------------------- */

    logo: {
        file: "Logo.jpeg",
        alt: "AVERRA Staffing Solutions Ltd logo"
    },


    /* -----------------------------------------------------
       HOMEPAGE
    ----------------------------------------------------- */

    homepage: {

        hero: {
            file: "hero-global-talent.jpg",
            alt: "International professionals supporting UK businesses"
        },

        globalNetwork: {
            file: "about-global-network.jpg",
            alt: "Global professional network connecting businesses with international talent"
        }

    },


    /* -----------------------------------------------------
       ABOUT AVERRA
    ----------------------------------------------------- */

    about: {

        globalNetwork: {
            file: "about-global-network.jpg",
            alt: "AVERRA connecting UK businesses with international professionals"
        },

        team: {
            file: "about-team.jpg",
            alt: "Professional team supporting staffing and outsourcing services"
        },

        ukIndia: {
            file: "about-uk-india.jpg",
            alt: "Professional connections between the United Kingdom and India"
        }

    },


    /* -----------------------------------------------------
       SERVICES
    ----------------------------------------------------- */

    services: {

        financeAccounting: {
            file: "services-finance-accounting.jpg",
            alt: "Finance and accounting professionals providing business support"
        },

        operationsAdmin: {
            file: "services-operations-admin.jpg",
            alt: "Operations and administration professionals supporting business teams"
        },

        customerSupport: {
            file: "services-customer-support.jpg",
            alt: "Customer support professionals assisting customers and clients"
        },

        salesMarketing: {
            file: "services-sales-marketing.jpg",
            alt: "Sales and marketing professionals supporting business growth"
        },

        itTechnology: {
            file: "services-it-technology.jpg",
            alt: "IT and technology professionals supporting digital operations"
        },

        engineering: {
            file: "services-engineering.jpg",
            alt: "Engineering professionals working on technical projects"
        },

        hrRecruitment: {
            file: "services-hr-recruitment.jpg",
            alt: "HR and recruitment professionals supporting talent acquisition"
        },

        dedicatedTeams: {
            file: "services-dedicated-teams.jpg",
            alt: "Dedicated remote professionals working as an extension of a client team"
        }

    },


    /* -----------------------------------------------------
       INDUSTRIES
    ----------------------------------------------------- */

    industries: {

        finance: {
            file: "industries-finance.jpg",
            alt: "Finance professionals supporting financial services businesses"
        },

        technology: {
            file: "industries-technology.jpg",
            alt: "Technology professionals supporting digital business operations"
        },

        engineering: {
            file: "industries-engineering.jpg",
            alt: "Engineering professionals supporting technical projects"
        },

        professionalServices: {
            file: "industries-professional-services.jpg",
            alt: "Professional services teams delivering specialist business expertise"
        },

        healthcare: {
            file: "industries-healthcare.jpg",
            alt: "Healthcare professionals working in a professional care environment"
        },

        ecommerce: {
            file: "industries-ecommerce.jpg",
            alt: "E-commerce professionals supporting online business operations"
        }

    },


    /* -----------------------------------------------------
       CAREERS
    ----------------------------------------------------- */

    careers: {

        globalOpportunities: {
            file: "careers-global-opportunities.jpg",
            alt: "International career opportunities for professionals exploring work with AVERRA"
        }

    }

};


/* =========================================================
   3. INTERNAL UTILITIES
========================================================= */

function averraIsObject(value) {

    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}


function averraLog() {

    if (
        !AVERRA_IMAGE_CONFIG.debug ||
        typeof console === "undefined"
    ) {
        return;
    }

    var args = Array.prototype.slice.call(arguments);

    if (typeof console.info === "function") {
        console.info.apply(console, args);
    }

}


function averraWarn() {

    if (typeof console === "undefined") {
        return;
    }

    var args = Array.prototype.slice.call(arguments);

    if (typeof console.warn === "function") {
        console.warn.apply(console, args);
    }

}


function averraError() {

    if (typeof console === "undefined") {
        return;
    }

    var args = Array.prototype.slice.call(arguments);

    if (typeof console.error === "function") {
        console.error.apply(console, args);
    }

}


function averraGetImageFolder() {

    var folder = AVERRA_IMAGE_CONFIG.imageFolder;

    if (
        typeof folder !== "string" ||
        !folder.trim()
    ) {
        return "images/";
    }

    folder = folder.trim().replace(/\\/g, "/");

    if (
        folder.indexOf("//") === 0 ||
        /^[a-z][a-z0-9+.-]*:/i.test(folder) ||
        folder.indexOf("?") !== -1 ||
        folder.indexOf("#") !== -1
    ) {
        return "images/";
    }

    folder = folder.replace(/^\/+/, "");

    var folderParts = folder.split("/");

    if (
        folderParts.some(function (part) {
            return part === ".." || part === ".";
        })
    ) {
        return "images/";
    }

    if (folder.charAt(folder.length - 1) !== "/") {
        folder += "/";
    }

    return folder;

}


/* =========================================================
   4. IMAGE FILENAME NORMALISATION
========================================================= */

/*
   Accepted examples:

   Logo.jpeg
   images/Logo.jpeg
   images/services/example.jpg

   Rejected examples:

   Empty paths
   External URLs
   Protocol-relative URLs
   Parent-directory traversal
   Backslashes
   Query strings
   Fragment identifiers
   Control characters

   Returns a path relative to the configured image folder.
*/

function normaliseImageFilename(filename) {

    if (
        typeof filename !== "string" ||
        !filename.trim()
    ) {
        return "";
    }

    var value = filename.trim();

    if (
        /^[a-z][a-z0-9+.-]*:/i.test(value) ||
        value.indexOf("//") === 0 ||
        value.indexOf("\\") !== -1 ||
        value.indexOf("?") !== -1 ||
        value.indexOf("#") !== -1 ||
        /[\u0000-\u001F\u007F]/.test(value)
    ) {
        return "";
    }

    value = value.replace(/^\/+/, "");

    var folder = averraGetImageFolder();

    if (value.indexOf(folder) === 0) {
        value = value.substring(folder.length);
    }

    if (
        !value ||
        value.charAt(value.length - 1) === "/"
    ) {
        return "";
    }

    var parts = value.split("/");

    for (var i = 0; i < parts.length; i++) {

        if (
            !parts[i] ||
            parts[i] === "." ||
            parts[i] === ".." ||
            /[\u0000-\u001F\u007F]/.test(parts[i])
        ) {
            return "";
        }

    }

    return value;

}


/* =========================================================
   5. IMAGE RECORD VALIDATION
========================================================= */

function isValidImageRecord(image) {

    return Boolean(
        averraIsObject(image) &&
        typeof image.file === "string" &&
        normaliseImageFilename(image.file)
    );

}


/* =========================================================
   6. IMAGE PATH HELPER
========================================================= */

/*
   Example:

   getImagePath(imageData.homepage.hero)

   Result:

   images/hero-global-talent.jpg
*/

function getImagePath(image) {

    if (!isValidImageRecord(image)) {
        return "";
    }

    return averraGetImageFolder() +
        normaliseImageFilename(image.file);

}


/* =========================================================
   7. IMAGE OBJECT HELPER
========================================================= */

/*
   Example:

   var hero = getImage(imageData.homepage.hero);

   Result:

   {
       src: "images/hero-global-talent.jpg",
       alt: "International professionals supporting UK businesses"
   }
*/

function getImage(image) {

    if (!isValidImageRecord(image)) {

        return {
            src: "",
            alt: ""
        };

    }

    return {

        src: getImagePath(image),

        alt: typeof image.alt === "string"
            ? image.alt
            : ""

    };

}


/* =========================================================
   8. IMAGE URL HELPER
========================================================= */

/*
   Example:

   getImageUrl("hero-global-talent.jpg")

   Result:

   images/hero-global-talent.jpg
*/

function getImageUrl(filename) {

    var normalised = normaliseImageFilename(filename);

    if (!normalised) {
        return "";
    }

    return averraGetImageFolder() + normalised;

}


/* =========================================================
   9. GET IMAGE BY SECTION AND KEY
========================================================= */

/*
   Examples:

   getImageByKey("homepage", "hero")
   getImageByKey("services", "financeAccounting")
   getImageByKey("industries", "technology")
*/

function getImageByKey(section, key) {

    if (
        typeof section !== "string" ||
        typeof key !== "string" ||
        !Object.prototype.hasOwnProperty.call(imageData, section)
    ) {
        return {
            src: "",
            alt: ""
        };
    }

    var sectionData = imageData[section];

    if (
        !averraIsObject(sectionData) ||
        !Object.prototype.hasOwnProperty.call(sectionData, key)
    ) {
        return {
            src: "",
            alt: ""
        };
    }

    return getImage(sectionData[key]);

}


/* =========================================================
   10. GET ALL REGISTERED IMAGES
========================================================= */

function getAllImages() {

    var images = [];

    function collectImages(sectionData, sectionName) {

        if (!averraIsObject(sectionData)) {
            return;
        }

        Object.keys(sectionData).forEach(function (key) {

            var item = sectionData[key];

            if (isValidImageRecord(item)) {

                images.push({

                    section: sectionName,

                    name: key,

                    file: normaliseImageFilename(item.file),

                    src: getImagePath(item),

                    alt: typeof item.alt === "string"
                        ? item.alt
                        : ""

                });

            } else if (averraIsObject(item)) {

                collectImages(
                    item,
                    sectionName + "." + key
                );

            }

        });

    }

    Object.keys(imageData).forEach(function (section) {

        var item = imageData[section];

        if (isValidImageRecord(item)) {

            images.push({

                section: section,

                name: section,

                file: normaliseImageFilename(item.file),

                src: getImagePath(item),

                alt: typeof item.alt === "string"
                    ? item.alt
                    : ""

            });

        } else if (averraIsObject(item)) {

            collectImages(item, section);

        }

    });

    return images;

}


/* =========================================================
   11. GET UNIQUE PHYSICAL IMAGE FILES
========================================================= */

/*
   Repeated references to the same image are included only
   once in the validation inventory.

   Comparison is case-insensitive for duplicate reporting.
   Actual hosted paths can still be case-sensitive.
*/

function getUniqueImages() {

    var allImages = getAllImages();
    var uniqueImages = [];
    var seenPaths = Object.create(null);

    allImages.forEach(function (item) {

        var key = item.src.toLowerCase();

        if (!key || seenPaths[key]) {
            return;
        }

        seenPaths[key] = true;

        uniqueImages.push(item);

    });

    return uniqueImages;

}


/* =========================================================
   12. IMAGE INVENTORY SUMMARY
========================================================= */

function getImageInventory() {

    var allImages = getAllImages();
    var uniqueImages = getUniqueImages();
    var sectionCounts = {};

    allImages.forEach(function (item) {

        if (!sectionCounts[item.section]) {
            sectionCounts[item.section] = 0;
        }

        sectionCounts[item.section]++;

    });

    return {

        totalReferences: allImages.length,

        uniqueFiles: uniqueImages.length,

        duplicateReferences:
            allImages.length - uniqueImages.length,

        sections: sectionCounts,

        images: allImages,

        uniqueImages: uniqueImages

    };

}


/* =========================================================
   13. FIND IMAGE REFERENCES BY FILENAME
========================================================= */

function findImagesByFilename(filename) {

    var normalised = normaliseImageFilename(filename);

    if (!normalised) {
        return [];
    }

    var target = normalised.toLowerCase();

    return getAllImages().filter(function (item) {

        return item.file.toLowerCase() === target;

    });

}


/* =========================================================
   14. FIND IMAGE RECORD BY SECTION AND KEY
========================================================= */

function findImageRecord(section, key) {

    if (
        typeof section !== "string" ||
        typeof key !== "string" ||
        !Object.prototype.hasOwnProperty.call(imageData, section)
    ) {
        return null;
    }

    var sectionData = imageData[section];

    if (
        !averraIsObject(sectionData) ||
        !Object.prototype.hasOwnProperty.call(sectionData, key)
    ) {
        return null;
    }

    var record = sectionData[key];

    return isValidImageRecord(record) ? record : null;

}


/* =========================================================
   15. GET IMAGES BY SECTION
========================================================= */

function getImagesBySection(section) {

    if (
        typeof section !== "string" ||
        !Object.prototype.hasOwnProperty.call(imageData, section)
    ) {
        return [];
    }

    return getAllImages().filter(function (item) {

        return item.section === section ||
            item.section.indexOf(section + ".") === 0;

    });

}


/* =========================================================
   16. BROWSER IMAGE VALIDATION
========================================================= */

/*
   Tests each unique registered image using browser loading.

   IMPORTANT:
   The return value is populated asynchronously. Use the
   callback or validateImagesAsync() to obtain final results.

   Example:

   validateImages(function (results) {
       console.log(results);
   });

   Results:

   {
       total: 0,
       loaded: 0,
       missing: 0,
       details: []
   }
*/

function validateImages(callback) {

    var uniqueImages = getUniqueImages();

    var results = {

        total: uniqueImages.length,

        loaded: 0,

        missing: 0,

        details: []

    };

    var completed = 0;
    var finalised = false;

    function finishValidation() {

        if (finalised) {
            return;
        }

        finalised = true;

        results.details.sort(function (a, b) {

            return a.file.localeCompare(b.file);

        });

        if (AVERRA_IMAGE_CONFIG.debug) {

            if (typeof console !== "undefined") {

                if (typeof console.group === "function") {
                    console.group(
                        "[AVERRA Images] Validation report"
                    );
                }

                if (typeof console.log === "function") {

                    console.log(
                        "Unique image files:",
                        results.total
                    );

                    console.log(
                        "Successfully loaded:",
                        results.loaded
                    );

                    console.log(
                        "Missing, inaccessible or timed out:",
                        results.missing
                    );

                }

                if (typeof console.table === "function") {
                    console.table(results.details);
                }

                results.details.forEach(function (detail) {

                    if (detail.status !== "loaded") {

                        averraError(
                            "[AVERRA Images] Image check failed:",
                            detail.src,
                            "(" + detail.status + ")"
                        );

                    }

                });

                if (typeof console.groupEnd === "function") {
                    console.groupEnd();
                }

            }

        }

        if (typeof callback === "function") {
            callback(results);
        }

    }

    if (typeof Image === "undefined") {

        averraWarn(
            "[AVERRA Images] Browser image validation is unavailable."
        );

        results.details.push({

            file: "",

            src: "",

            status: "unavailable"

        });

        results.total = 0;

        if (typeof callback === "function") {
            callback(results);
        }

        return results;

    }

    if (uniqueImages.length === 0) {

        finishValidation();

        return results;

    }

    uniqueImages.forEach(function (item) {

        var testImage = new Image();

        var finished = false;

        var timeoutId = null;

        function finish(status) {

            if (finished) {
                return;
            }

            finished = true;

            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }

            testImage.onload = null;
            testImage.onerror = null;

            if (status === "loaded") {

                results.loaded++;

                if (AVERRA_IMAGE_CONFIG.logSuccessfulLoads) {

                    averraLog(
                        "[AVERRA Images] Loaded:",
                        item.src
                    );

                }

            } else {

                results.missing++;

            }

            results.details.push({

                file: item.file,

                src: item.src,

                status: status

            });

            completed++;

            if (completed === uniqueImages.length) {
                finishValidation();
            }

        }

        testImage.onload = function () {
            finish("loaded");
        };

        testImage.onerror = function () {
            finish("missing");
        };

        timeoutId = setTimeout(function () {

            finish("timeout");

        }, Math.max(
            1000,
            Number(AVERRA_IMAGE_CONFIG.validationTimeout) || 15000
        ));

        testImage.src = item.src;

        /* Account for cached images. */
        if (
            testImage.complete &&
            testImage.naturalWidth > 0
        ) {
            finish("loaded");
        }

    });

    return results;

}


/* =========================================================
   17. PROMISE-BASED IMAGE VALIDATION
========================================================= */

/*
   Recommended for scripts that need final results.

   Example:

   validateImagesAsync().then(function (results) {

       console.log("Loaded:", results.loaded);

       console.log("Missing:", results.missing);

   });
*/

function validateImagesAsync() {

    return new Promise(function (resolve) {

        validateImages(function (results) {

            resolve(results);

        });

    });

}


/* =========================================================
   18. CHECK WHETHER ONE IMAGE EXISTS
========================================================= */

/*
   Example:

   checkImageExists(
       "hero-global-talent.jpg",
       function (exists) {
           console.log(exists);
       }
   );
*/

function checkImageExists(filename, callback) {

    var src = getImageUrl(filename);

    if (!src || typeof Image === "undefined") {

        if (typeof callback === "function") {
            callback(false);
        }

        return;

    }

    var testImage = new Image();

    var finished = false;

    var timeoutId = null;

    function finish(exists) {

        if (finished) {
            return;
        }

        finished = true;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        testImage.onload = null;
        testImage.onerror = null;

        if (typeof callback === "function") {
            callback(exists);
        }

    }

    testImage.onload = function () {
        finish(true);
    };

    testImage.onerror = function () {
        finish(false);
    };

    timeoutId = setTimeout(function () {

        finish(false);

    }, Math.max(
        1000,
        Number(AVERRA_IMAGE_CONFIG.validationTimeout) || 15000
    ));

    testImage.src = src;

    if (
        testImage.complete &&
        testImage.naturalWidth > 0
    ) {
        finish(true);
    }

}


/* =========================================================
   19. IMAGE ERROR HANDLER
========================================================= */

/*
   Optional usage:

   handleImageError(img, "image-placeholder.jpg");

   The fallback must be located inside images/.

   Each image element gets no more than one fallback
   attempt, preventing infinite fallback loops.
*/

function handleImageError(img, fallbackPath) {

    if (
        !img ||
        !img.tagName ||
        img.tagName.toLowerCase() !== "img"
    ) {
        return;
    }

    var errorAttribute =
        AVERRA_IMAGE_CONFIG.errorAttribute;

    if (img.getAttribute(errorAttribute) === "true") {
        return;
    }

    img.setAttribute(errorAttribute, "true");

    averraError(
        "[AVERRA Images] Failed to load:",
        img.currentSrc || img.src || "(no source)"
    );

    var fallback = fallbackPath ||
        AVERRA_IMAGE_CONFIG.fallbackImage;

    if (!fallback) {
        return;
    }

    var fallbackUrl = getImageUrl(fallback);

    if (!fallbackUrl) {

        averraWarn(
            "[AVERRA Images] Invalid fallback image:",
            fallback
        );

        return;

    }

    /*
       Avoid attempting to load the same failed image
       as its own fallback.
    */

    var currentSource = img.getAttribute("src") || "";

    if (currentSource === fallbackUrl) {

        averraWarn(
            "[AVERRA Images] Fallback matches the failed source:",
            fallbackUrl
        );

        return;

    }

    img.src = fallbackUrl;

}


/* =========================================================
   20. ATTACH IMAGE ERROR HANDLING
========================================================= */

function attachImageError(img, fallbackPath) {

    if (
        !img ||
        !img.addEventListener ||
        !img.getAttribute ||
        !img.setAttribute
    ) {
        return;
    }

    var listenerAttribute =
        AVERRA_IMAGE_CONFIG.listenerAttribute;

    if (img.getAttribute(listenerAttribute) === "true") {
        return;
    }

    img.setAttribute(listenerAttribute, "true");

    img.addEventListener("error", function () {

        handleImageError(img, fallbackPath);

    });

}


/* =========================================================
   21. PROCESS AN HTML IMAGE ELEMENT
========================================================= */

/*
   Preserves existing src, alt, loading and decoding values.

   Existing HTML images do not need to be rewritten merely
   to receive error handling and default loading attributes.
*/

function processImageElement(img) {

    if (
        !img ||
        !img.tagName ||
        img.tagName.toLowerCase() !== "img"
    ) {
        return;
    }

    attachImageError(img);

    if (AVERRA_IMAGE_CONFIG.enableLazyLoading) {

        var isLogo = img.closest
            ? Boolean(
                img.closest(
                    "header, nav, .logo, .site-logo, .site-header"
                )
            )
            : false;

        if (!img.hasAttribute("loading")) {

            img.setAttribute(
                "loading",
                isLogo
                    ? "eager"
                    : AVERRA_IMAGE_CONFIG.defaultLoading
            );

        }

    }

    if (
        AVERRA_IMAGE_CONFIG.defaultDecoding &&
        !img.hasAttribute("decoding")
    ) {

        img.setAttribute(
            "decoding",
            AVERRA_IMAGE_CONFIG.defaultDecoding
        );

    }

    /*
       Apply crossOrigin only when explicitly configured.
    */

    if (
        typeof AVERRA_IMAGE_CONFIG.crossOrigin === "string" &&
        !img.hasAttribute("crossorigin")
    ) {

        img.crossOrigin = AVERRA_IMAGE_CONFIG.crossOrigin;

    }

    img.setAttribute(
        AVERRA_IMAGE_CONFIG.processedAttribute,
        "true"
    );

}


/* =========================================================
   22. PROCESS EXISTING PAGE IMAGES
========================================================= */

function initialiseImageErrorHandling() {

    if (
        typeof document === "undefined" ||
        !document.querySelectorAll
    ) {
        return;
    }

    var images = document.querySelectorAll("img");

    Array.prototype.forEach.call(images, function (img) {

        processImageElement(img);

    });

}


/* =========================================================
   23. OBSERVE DYNAMICALLY ADDED IMAGES
========================================================= */

var AVERRA_IMAGE_OBSERVER = null;


function observeDynamicImages() {

    if (
        !AVERRA_IMAGE_CONFIG.observeDynamicImages ||
        typeof document === "undefined" ||
        typeof MutationObserver === "undefined" ||
        !document.documentElement
    ) {
        return null;
    }

    if (AVERRA_IMAGE_OBSERVER) {
        return AVERRA_IMAGE_OBSERVER;
    }

    AVERRA_IMAGE_OBSERVER = new MutationObserver(
        function (mutations) {

            mutations.forEach(function (mutation) {

                Array.prototype.forEach.call(
                    mutation.addedNodes,
                    function (node) {

                        if (
                            !node ||
                            node.nodeType !== 1
                        ) {
                            return;
                        }

                        if (
                            node.tagName &&
                            node.tagName.toLowerCase() === "img"
                        ) {

                            processImageElement(node);

                        }

                        if (node.querySelectorAll) {

                            var nestedImages =
                                node.querySelectorAll("img");

                            Array.prototype.forEach.call(
                                nestedImages,
                                function (img) {

                                    processImageElement(img);

                                }
                            );

                        }

                    }
                );

            });

        }
    );

    AVERRA_IMAGE_OBSERVER.observe(
        document.documentElement,
        {
            childList: true,
            subtree: true
        }
    );

    return AVERRA_IMAGE_OBSERVER;

}


/* =========================================================
   24. STOP DYNAMIC IMAGE OBSERVATION
========================================================= */

function stopObservingDynamicImages() {

    if (AVERRA_IMAGE_OBSERVER) {

        AVERRA_IMAGE_OBSERVER.disconnect();

        AVERRA_IMAGE_OBSERVER = null;

    }

}


/* =========================================================
   25. CREATE AN IMAGE ELEMENT
========================================================= */

/*
   Example:

   var hero = createImageElement(
       imageData.homepage.hero,
       "averra-hero-image"
   );

   document.querySelector(".hero").appendChild(hero);
*/

function createImageElement(image, className) {

    if (
        typeof document === "undefined" ||
        !document.createElement ||
        !isValidImageRecord(image)
    ) {
        return null;
    }

    var details = getImage(image);

    if (!details.src) {
        return null;
    }

    var img = document.createElement("img");

    img.src = details.src;

    img.alt = details.alt;

    if (
        typeof className === "string" &&
        className.trim()
    ) {

        img.className = className.trim();

    }

    processImageElement(img);

    return img;

}


/* =========================================================
   26. PRINT IMAGE INVENTORY
========================================================= */

/*
   Browser console:

   printImageInventory();
*/

function printImageInventory() {

    var inventory = getImageInventory();

    if (typeof console !== "undefined") {

        if (typeof console.group === "function") {
            console.group("[AVERRA Images] Image inventory");
        }

        if (typeof console.log === "function") {

            console.log(
                "Total image references:",
                inventory.totalReferences
            );

            console.log(
                "Unique physical files:",
                inventory.uniqueFiles
            );

            console.log(
                "Repeated references:",
                inventory.duplicateReferences
            );

        }

        if (typeof console.table === "function") {
            console.table(inventory.images);
        }

        if (typeof console.log === "function") {

            console.log(
                "Counts by section:",
                inventory.sections
            );

        }

        if (typeof console.groupEnd === "function") {
            console.groupEnd();
        }

    }

    return inventory;

}


/* =========================================================
   27. PRINT MISSING IMAGE REPORT
========================================================= */

/*
   Browser console:

   printMissingImages();

   The callback-based validation runs asynchronously.
*/

function printMissingImages() {

    return validateImages(function (results) {

        var missingImages = results.details.filter(
            function (item) {

                return item.status !== "loaded";

            }
        );

        if (typeof console !== "undefined") {

            if (typeof console.group === "function") {

                console.group(
                    "[AVERRA Images] Missing image report"
                );

            }

            if (typeof console.log === "function") {

                console.log(
                    "Images requiring attention:",
                    missingImages.length
                );

            }

            if (typeof console.table === "function") {
                console.table(missingImages);
            }

            if (typeof console.groupEnd === "function") {
                console.groupEnd();
            }

        }

    });

}


/* =========================================================
   28. CHECK IMAGE CONFIGURATION INTEGRITY
========================================================= */

/*
   Checks:
   - Invalid image records
   - References without alt text
   - Repeated physical image files

   Repeated files are not necessarily errors. For example,
   the homepage and About page intentionally share the
   global network image.
*/

function checkImageConfiguration() {

    var inventory = getImageInventory();

    var invalidRecords = [];

    var missingAltText = [];

    var duplicateFiles = [];

    function inspect(data, path) {

        if (!averraIsObject(data)) {
            return;
        }

        Object.keys(data).forEach(function (key) {

            var item = data[key];

            var itemPath = path
                ? path + "." + key
                : key;

            if (
                averraIsObject(item) &&
                Object.prototype.hasOwnProperty.call(item, "file")
            ) {

                if (!isValidImageRecord(item)) {

                    invalidRecords.push({

                        reference: itemPath,

                        file: typeof item.file === "string"
                            ? item.file
                            : ""

                    });

                    return;

                }

                if (
                    typeof item.alt !== "string" ||
                    !item.alt.trim()
                ) {

                    missingAltText.push({

                        reference: itemPath,

                        file: item.file

                    });

                }

            } else if (averraIsObject(item)) {

                inspect(item, itemPath);

            }

        });

    }

    inspect(imageData, "");

    var seen = Object.create(null);

    inventory.images.forEach(function (item) {

        var key = item.file.toLowerCase();

        if (!seen[key]) {
            seen[key] = [];
        }

        seen[key].push(item);

    });

    Object.keys(seen).forEach(function (key) {

        if (seen[key].length > 1) {

            duplicateFiles.push({

                file: key,

                references: seen[key].length,

                sections: seen[key].map(function (item) {

                    return item.section + "." + item.name;

                })

            });

        }

    });

    var report = {

        valid: invalidRecords.length === 0,

        totalReferences: inventory.totalReferences,

        uniqueFiles: inventory.uniqueFiles,

        invalidRecords: invalidRecords,

        missingAltText: missingAltText,

        duplicateFiles: duplicateFiles

    };

    if (AVERRA_IMAGE_CONFIG.debug) {

        if (typeof console !== "undefined") {

            if (typeof console.group === "function") {

                console.group(
                    "[AVERRA Images] Configuration integrity"
                );

            }

            if (typeof console.log === "function") {

                console.log(
                    "Valid configuration:",
                    report.valid
                );

                console.log(
                    "Invalid records:",
                    report.invalidRecords.length
                );

                console.log(
                    "References without alt text:",
                    report.missingAltText.length
                );

                console.log(
                    "Repeated image files:",
                    report.duplicateFiles.length
                );

            }

            if (typeof console.table === "function") {

                console.table(report.invalidRecords);

                console.table(report.missingAltText);

                console.table(report.duplicateFiles);

            }

            if (typeof console.groupEnd === "function") {
                console.groupEnd();
            }

        }

    }

    return report;

}


/* =========================================================
   29. INITIALISE THE AVERRA IMAGE SYSTEM
========================================================= */

(function initialiseAverraImages() {

    if (typeof document === "undefined") {
        return;
    }

    var initialised = false;

    function start() {

        if (initialised) {
            return;
        }

        initialised = true;

        /* Process all images already in the document. */
        initialiseImageErrorHandling();

        /* Process images inserted later by other scripts. */
        observeDynamicImages();

        if (AVERRA_IMAGE_CONFIG.debug) {

            var inventory = getImageInventory();

            averraLog(
                "[AVERRA Images] Configuration loaded."
            );

            averraLog(
                "[AVERRA Images] Unique files registered:",
                inventory.uniqueFiles
            );

            averraLog(
                "[AVERRA Images] Total image references:",
                inventory.totalReferences
            );

        }

        /* Start validation only after initialisation. */
        if (AVERRA_IMAGE_CONFIG.autoValidate) {

            validateImages();

        }

    }

    /*
       Works whether the script loads before or after
       DOMContentLoaded.
    */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );

    } else {

        start();

    }

})();


/* =========================================================
   END OF AVERRA IMAGE MANAGEMENT SYSTEM
========================================================= */