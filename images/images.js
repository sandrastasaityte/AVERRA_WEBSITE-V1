/* =========================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: images.js
   Version: 5.0
   =========================================================

   FEATURES
   - Centralised image catalogue
   - Exact supplied image filenames
   - Existing catalogue keys preserved
   - Backward-compatible helper functions
   - Safe image path generation
   - Nested image lookup
   - Complete image inventory
   - Duplicate reference detection
   - Browser image loading validation
   - Missing image and error reporting
   - Image dimension reporting
   - Validation timeouts
   - HTML image element error handling
   - Browser console audit reports
   - No external dependencies

   DIRECTORY STRUCTURE

   website/
   ├── index.html
   ├── about.html
   ├── services.html
   ├── careers.html
   ├── contact.html
   ├── images.js
   ├── style.css
   ├── script.js
   └── images/
       ├── Logo.jpeg
       ├── about-global-network.jpg
       ├── about-uk-india.jpg
       └── ...

   ========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURATION
   ========================================================= */

var AVERRA_IMAGE_FOLDER = "images/";

var AVERRA_IMAGE_VALIDATION_TIMEOUT = 10000;

var AVERRA_IMAGE_SUPPORTED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".avif"
];

/* =========================================================
   2. IMAGE ASSET CATALOGUE
   ========================================================= */

var imageData = {

    logo: {
        file: "Logo.jpeg",
        alt: "AVERRA Staffing Solutions Ltd logo"
    },

    about: {

        globalNetwork: {
            file: "about-global-network.jpg",
            alt: "Global professional network connecting UK businesses with international talent"
        },

        ukIndia: {
            file: "about-uk-india.jpg",
            alt: "Professional connections between the United Kingdom and India"
        }

    },

    architecture: {

        architecture1: {
            file: "architecture1.jpg",
            alt: "Architecture and building design"
        },

        architecture2: {
            file: "architecture2.jpg",
            alt: "Architectural design and professional planning"
        },

        architecture3: {
            file: "architecture3.jpg",
            alt: "Architecture project and building design"
        },

        architecture5: {
            file: "architecture5.jpg",
            alt: "Architecture and technical design services"
        }

    },

    business: {

        professionals: {
            file: "business-professionals.jpg",
            alt: "Business professionals collaborating"
        },

        globalTeam: {
            file: "global-team.jpg",
            alt: "International professionals working as a global team"
        },

        teamMeetings: {
            file: "team-meetings.jpg",
            alt: "Professional team meeting"
        },

        meetingsProfessional: {
            file: "meetings professional.jpg",
            alt: "Professionals participating in a business meeting"
        }

    },

    careers: {

        globalOpportunities: {
            file: "career-global-opportunities.jpg",
            alt: "Global career opportunities for professionals"
        }

    },

    communication: {

        email: {
            file: "email2.png",
            alt: "Email communication"
        },

        message: {
            file: "message.png",
            alt: "Business messaging"
        },

        virtualCall: {
            file: "virtual-call.jpg",
            alt: "Professionals communicating through a virtual call"
        },

        virtualMeetings: {
            file: "virtual-meetings.jpg",
            alt: "Remote professionals attending a virtual meeting"
        },

        virtualCalls: {
            file: "virtuals calls.jpg",
            alt: "Virtual calls between remote professionals"
        }

    },

    finance: {

        finance: {
            file: "finance.jpg",
            alt: "Finance and accounting services"
        },

        financeOffice: {
            file: "finance-office.png",
            alt: "Finance professionals working in an office"
        },

        financeVirtualReality: {
            file: "finance-virtual-reality.jpg",
            alt: "Technology-enabled financial services"
        },

        virtualFinance: {
            file: "Virtual-finance-2.jpg",
            alt: "Virtual finance and accounting support"
        }

    },

    workplace: {

        employeeVirtual: {
            file: "employee-v-virtual.png",
            alt: "Comparison of employee and virtual working arrangements"
        },

        remoteWorker: {
            file: "remote-worker.png",
            alt: "Professional working remotely"
        },

        virtualOffice: {
            file: "virtual-office.png",
            alt: "Virtual office and remote working"
        },

        virtualOfficePhoto: {
            file: "virtualOffice.jpg",
            alt: "Virtual office environment"
        },

        virtualImage: {
            file: "virtual-image.jpg",
            alt: "Virtual work and digital collaboration"
        },

        meetings: {
            file: "meetings professional.jpg",
            alt: "Business professionals collaborating remotely"
        }

    },

    locations: {

        location: {
            file: "location.jpg",
            alt: "Business location"
        },

        location2: {
            file: "location2.jpg",
            alt: "Business location and workplace"
        },

        registeredOffice: {
            file: "registered-office.png",
            alt: "Registered business office"
        }

    },

    general: {

        images: {
            file: "images.jpg",
            alt: "General business image"
        },

        frequentQuestions: {
            file: "frequent-questions.jpg",
            alt: "Frequently asked questions and customer support"
        }

    }

};

/* =========================================================
   3. INTERNAL HELPERS
   ========================================================= */

/**
 * Check whether a filename is a safe, plain filename.
 *
 * Directory traversal, path separators, query strings
 * and URL fragments are not accepted.
 */
function averraIsValidImageFilename(filename) {

    if (typeof filename !== "string") {
        return false;
    }

    var name = filename.trim();

    if (!name) {
        return false;
    }

    if (
        name === "." ||
        name === ".." ||
        name.indexOf("..") !== -1 ||
        name.indexOf("/") !== -1 ||
        name.indexOf("\\") !== -1 ||
        name.indexOf("?") !== -1 ||
        name.indexOf("#") !== -1 ||
        /[\u0000-\u001F\u007F]/.test(name)
    ) {
        return false;
    }

    return true;
}

/**
 * Encode filenames for URL use.
 *
 * Spaces are encoded correctly.
 * Filename capitalization is preserved.
 */
function averraEncodeFilename(filename) {

    try {
        return encodeURIComponent(filename);
    } catch (error) {
        return "";
    }
}

/**
 * Return the extension of a filename.
 */
function averraGetImageExtension(filename) {

    if (!averraIsValidImageFilename(filename)) {
        return "";
    }

    var lastDot = filename.lastIndexOf(".");

    if (lastDot < 0) {
        return "";
    }

    return filename.slice(lastDot).toLowerCase();
}

/**
 * Check whether an extension is supported.
 *
 * This is a filename check, not proof that the
 * file contains a valid image.
 */
function averraIsSupportedImageExtension(filename) {

    var extension = averraGetImageExtension(filename);

    return AVERRA_IMAGE_SUPPORTED_EXTENSIONS.indexOf(
        extension
    ) !== -1;
}

/* =========================================================
   4. IMAGE PATH HELPERS
   ========================================================= */

/**
 * Generate a relative image path.
 *
 * Example:
 * images/Logo.jpeg
 */
function averraGetImagePath(image) {

    if (
        !image ||
        typeof image.file !== "string"
    ) {
        return "";
    }

    var filename = image.file.trim();

    if (!averraIsValidImageFilename(filename)) {
        return "";
    }

    var encodedFilename = averraEncodeFilename(filename);

    if (!encodedFilename) {
        return "";
    }

    return AVERRA_IMAGE_FOLDER + encodedFilename;
}

/**
 * Backward-compatible image path helper.
 */
function getImagePath(image) {

    return averraGetImagePath(image);
}

/**
 * Return the source and alternative text for an image.
 */
function getImage(image) {

    if (
        !image ||
        typeof image.file !== "string"
    ) {
        return {
            src: "",
            alt: ""
        };
    }

    return {
        src: averraGetImagePath(image),
        alt: typeof image.alt === "string"
            ? image.alt
            : ""
    };
}

/**
 * Generate an image URL directly from a filename.
 */
function getImageUrl(filename) {

    if (typeof filename !== "string") {
        return "";
    }

    return averraGetImagePath({
        file: filename
    });
}

/* =========================================================
   5. NESTED IMAGE LOOKUP
   ========================================================= */

/**
 * Retrieve an image by section and key.
 *
 * Examples:
 *
 * getImageByKey("about", "globalNetwork")
 * getImageByKey("business", "globalTeam")
 * getImageByKey("finance", "financeOffice")
 *
 * Nested keys are also supported:
 *
 * getImageByKey("about", "globalNetwork")
 *
 * Returns:
 * { src: "...", alt: "..." }
 */
function getImageByKey(section, key) {

    if (
        typeof section !== "string" ||
        typeof key !== "string" ||
        !section.trim() ||
        !key.trim() ||
        !Object.prototype.hasOwnProperty.call(
            imageData,
            section
        )
    ) {
        return {
            src: "",
            alt: ""
        };
    }

    var current = imageData[section];

    var keys = key.split(".");

    for (var i = 0; i < keys.length; i++) {

        if (
            !current ||
            typeof current !== "object" ||
            !Object.prototype.hasOwnProperty.call(
                current,
                keys[i]
            )
        ) {
            return {
                src: "",
                alt: ""
            };
        }

        current = current[keys[i]];
    }

    return getImage(current);
}

/**
 * Retrieve an image using its full catalogue path.
 *
 * Examples:
 *
 * getImageByPath("logo")
 * getImageByPath("about.globalNetwork")
 * getImageByPath("finance.virtualFinance")
 * getImageByPath("workplace.remoteWorker")
 */
function getImageByPath(path) {

    if (
        typeof path !== "string" ||
        !path.trim()
    ) {
        return {
            src: "",
            alt: ""
        };
    }

    var keys = path.split(".");
    var current = imageData;

    for (var i = 0; i < keys.length; i++) {

        if (
            !current ||
            typeof current !== "object" ||
            !Object.prototype.hasOwnProperty.call(
                current,
                keys[i]
            )
        ) {
            return {
                src: "",
                alt: ""
            };
        }

        current = current[keys[i]];
    }

    return getImage(current);
}

/* =========================================================
   6. COMPLETE IMAGE INVENTORY
   ========================================================= */

/**
 * Return all image references in the catalogue.
 *
 * Each result contains:
 * section, name, file, src, alt
 */
function getAllImages() {

    var results = [];

    function scan(object, section) {

        Object.keys(object).forEach(function (key) {

            var item = object[key];

            if (
                item &&
                typeof item === "object" &&
                !Array.isArray(item) &&
                typeof item.file === "string"
            ) {

                results.push({

                    section: section,

                    name: key,

                    key: section
                        ? section + "." + key
                        : key,

                    file: item.file,

                    src: averraGetImagePath(item),

                    alt: typeof item.alt === "string"
                        ? item.alt
                        : ""

                });

            } else if (
                item &&
                typeof item === "object" &&
                !Array.isArray(item)
            ) {

                scan(
                    item,
                    section
                        ? section + "." + key
                        : key
                );

            }

        });

    }

    scan(imageData, "");

    return results;
}

/**
 * Return unique image files.
 *
 * Duplicate comparison ignores filename case.
 * Original filenames are not modified.
 */
function getUniqueImages() {

    var seen = Object.create(null);

    return getAllImages().filter(function (item) {

        var key = item.file.toLowerCase();

        if (seen[key]) {
            return false;
        }

        seen[key] = true;

        return true;
    });
}

/**
 * Return duplicated image references.
 */
function getDuplicateImages() {

    var groups = Object.create(null);

    getAllImages().forEach(function (item) {

        var key = item.file.toLowerCase();

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(item);

    });

    return Object.keys(groups)
        .filter(function (key) {
            return groups[key].length > 1;
        })
        .map(function (key) {

            return {
                file: groups[key][0].file,
                references: groups[key]
            };

        });
}

/**
 * Return the complete catalogue summary.
 */
function getImageInventory() {

    var all = getAllImages();
    var unique = getUniqueImages();
    var duplicates = getDuplicateImages();

    return {

        totalReferences: all.length,

        uniqueFiles: unique.length,

        duplicateReferences:
            all.length - unique.length,

        duplicateFiles: duplicates.length,

        invalidFilenames: all.filter(function (item) {
            return !averraIsValidImageFilename(item.file);
        }),

        unsupportedExtensions: all.filter(function (item) {
            return !averraIsSupportedImageExtension(item.file);
        }),

        images: all,

        uniqueImages: unique,

        duplicates: duplicates

    };
}

/* =========================================================
   7. BROWSER IMAGE VALIDATION
   ========================================================= */

/**
 * Test whether a single image can load.
 *
 * The browser requests the image at the configured path.
 *
 * Results:
 * loaded
 * load-error
 * invalid-path
 * unsupported-extension
 * browser-unavailable
 * timeout
 */
function averraValidateImage(image, options) {

    options = options || {};

    var timeout = Number(options.timeout);

    if (
        !Number.isFinite(timeout) ||
        timeout <= 0
    ) {
        timeout = AVERRA_IMAGE_VALIDATION_TIMEOUT;
    }

    return new Promise(function (resolve) {

        var filename = image &&
            typeof image.file === "string"
            ? image.file.trim()
            : "";

        var src = averraGetImagePath(image);

        if (!src) {

            resolve({

                file: filename,

                src: "",

                valid: false,

                status: "invalid-path",

                width: 0,

                height: 0

            });

            return;
        }

        if (!averraIsSupportedImageExtension(filename)) {

            resolve({

                file: filename,

                src: src,

                valid: false,

                status: "unsupported-extension",

                width: 0,

                height: 0

            });

            return;
        }

        if (typeof Image === "undefined") {

            resolve({

                file: filename,

                src: src,

                valid: false,

                status: "browser-unavailable",

                width: 0,

                height: 0

            });

            return;
        }

        var testImage = new Image();

        var completed = false;

        var timer = null;

        function finish(result) {

            if (completed) {
                return;
            }

            completed = true;

            if (timer !== null) {
                clearTimeout(timer);
            }

            testImage.onload = null;
            testImage.onerror = null;

            resolve(result);
        }

        timer = setTimeout(function () {

            finish({

                file: filename,

                src: src,

                valid: false,

                status: "timeout",

                width: 0,

                height: 0

            });

        }, timeout);

        testImage.onload = function () {

            var width = testImage.naturalWidth || 0;

            var height = testImage.naturalHeight || 0;

            var valid = width > 0 && height > 0;

            finish({

                file: filename,

                src: src,

                valid: valid,

                status: valid
                    ? "loaded"
                    : "invalid-image",

                width: width,

                height: height

            });

        };

        testImage.onerror = function () {

            finish({

                file: filename,

                src: src,

                valid: false,

                status: "load-error",

                width: 0,

                height: 0

            });

        };

        testImage.src = src;

    });
}

/**
 * Validate every unique catalogue image.
 *
 * Returns a Promise.
 *
 * Example:
 *
 * validateAllImages().then(function (report) {
 *     console.table(report.results);
 * });
 */
function validateAllImages(options) {

    options = options || {};

    var images = getUniqueImages();

    return Promise.all(

        images.map(function (item) {

            return averraValidateImage(item, options);

        })

    ).then(function (results) {

        var passed = results.filter(function (item) {
            return item.valid;
        });

        var failed = results.filter(function (item) {
            return !item.valid;
        });

        return {

            total: results.length,

            passed: passed.length,

            failed: failed.length,

            success: failed.length === 0,

            results: results,

            missingImages: failed,

            checkedAt: new Date().toISOString()

        };

    });

}

/* =========================================================
   8. IMAGE AUDIT REPORT
   ========================================================= */

/**
 * Run the image validation audit and print a report.
 */
function auditImages(options) {

    var inventory = getImageInventory();

    return validateAllImages(options).then(function (report) {

        console.group(
            "AVERRA Staffing Solutions Ltd — Image Audit"
        );

        console.log(
            "Catalogue references:",
            inventory.totalReferences
        );

        console.log(
            "Unique catalogue filenames:",
            inventory.uniqueFiles
        );

        console.log(
            "Duplicate references:",
            inventory.duplicateReferences
        );

        console.log(
            "Unique images successfully loaded:",
            report.passed
        );

        console.log(
            "Images that failed validation:",
            report.failed
        );

        console.log(
            "Audit completed:",
            report.checkedAt
        );

        if (inventory.duplicates.length > 0) {

            console.warn(
                "Duplicate image references:",
                inventory.duplicates
            );

        }

        if (inventory.invalidFilenames.length > 0) {

            console.error(
                "Invalid filenames:",
                inventory.invalidFilenames
            );

        }

        if (report.results.length > 0) {

            console.table(report.results);

        }

        if (report.missingImages.length > 0) {

            console.warn(
                "Images requiring attention:",
                report.missingImages
            );

        }

        console.groupEnd();

        return {

            inventory: inventory,

            validation: report

        };

    }).catch(function (error) {

        console.error(
            "AVERRA image audit failed:",
            error
        );

        throw error;

    });

}

/* =========================================================
   9. CHECK EXISTING HTML IMAGE ELEMENTS
   ========================================================= */

/**
 * Check image elements already present on the page.
 *
 * This function does not change their sources.
 *
 * Example:
 * auditPageImages()
 */
function auditPageImages() {

    if (
        typeof document === "undefined" ||
        typeof document.querySelectorAll !== "function"
    ) {

        return {

            total: 0,

            loaded: 0,

            failed: 0,

            results: []

        };

    }

    var elements = Array.prototype.slice.call(
        document.querySelectorAll("img")
    );

    var results = elements.map(function (element) {

        var loaded = element.complete &&
            element.naturalWidth > 0;

        var failed = element.complete &&
            element.naturalWidth === 0;

        return {

            src: element.currentSrc || element.src || "",

            alt: element.alt || "",

            loaded: loaded,

            failed: failed,

            status: loaded
                ? "loaded"
                : failed
                    ? "load-error"
                    : "pending",

            width: element.naturalWidth || 0,

            height: element.naturalHeight || 0

        };

    });

    return {

        total: results.length,

        loaded: results.filter(function (item) {
            return item.loaded;
        }).length,

        failed: results.filter(function (item) {
            return item.failed;
        }).length,

        pending: results.filter(function (item) {
            return item.status === "pending";
        }).length,

        results: results

    };

}

/* =========================================================
   10. OPTIONAL LIVE IMAGE ERROR HANDLING
   ========================================================= */

/**
 * Attach error reporting to existing and future image
 * elements within a selected root element.
 *
 * This function logs image errors. It does not replace
 * images automatically or hide failed images.
 *
 * Example:
 * monitorImageErrors()
 */
function monitorImageErrors(root) {

    if (
        typeof document === "undefined" ||
        typeof document.addEventListener !== "function"
    ) {
        return false;
    }

    root = root || document;

    if (
        typeof root.addEventListener !== "function"
    ) {
        return false;
    }

    if (root.__averraImageErrorMonitorAttached) {
        return true;
    }

    root.__averraImageErrorMonitorAttached = true;

    root.addEventListener("error", function (event) {

        var target = event.target;

        if (
            !target ||
            target.tagName !== "IMG"
        ) {
            return;
        }

        console.error(
            "[AVERRA] Image failed to load:",
            {
                src: target.currentSrc || target.src || "",
                alt: target.alt || "",
                element: target
            }
        );

    }, true);

    return true;

}

/* =========================================================
   11. BACKWARD-COMPATIBLE GLOBAL EXPORTS
   ========================================================= */

if (typeof window !== "undefined") {

    window.AVERRA_IMAGE_FOLDER =
        AVERRA_IMAGE_FOLDER;

    window.AVERRA_IMAGE_VALIDATION_TIMEOUT =
        AVERRA_IMAGE_VALIDATION_TIMEOUT;

    window.AVERRA_IMAGE_SUPPORTED_EXTENSIONS =
        AVERRA_IMAGE_SUPPORTED_EXTENSIONS;

    window.imageData = imageData;

    window.averraIsValidImageFilename =
        averraIsValidImageFilename;

    window.averraIsSupportedImageExtension =
        averraIsSupportedImageExtension;

    window.averraGetImagePath =
        averraGetImagePath;

    window.getImagePath =
        getImagePath;

    window.getImage =
        getImage;

    window.getImageUrl =
        getImageUrl;

    window.getImageByKey =
        getImageByKey;

    window.getImageByPath =
        getImageByPath;

    window.getAllImages =
        getAllImages;

    window.getUniqueImages =
        getUniqueImages;

    window.getDuplicateImages =
        getDuplicateImages;

    window.getImageInventory =
        getImageInventory;

    window.averraValidateImage =
        averraValidateImage;

    window.validateAllImages =
        validateAllImages;

    window.auditImages =
        auditImages;

    window.auditPageImages =
        auditPageImages;

    window.monitorImageErrors =
        monitorImageErrors;

}

/* =========================================================
   12. END OF IMAGE MANAGEMENT SYSTEM
   ========================================================= */