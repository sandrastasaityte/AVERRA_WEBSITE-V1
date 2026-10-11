/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   CENTRAL WEBSITE IMAGE MANAGEMENT SYSTEM
   File: images.js
   Version: 7.0
   ============================================================

   FEATURES
   - Central image catalogue for all website pages
   - Backwards-compatible global functions
   - Supports existing image filenames
   - Safe local image URL generation
   - Automatic HTML image mapping
   - Image inventory and duplicate detection
   - Missing filename and alt-text audits
   - Broken-image detection
   - Asynchronous image validation
   - JSON inventory and audit exports
   - Downloadable JSON reports
   - Optional live image-error monitoring
   - Dynamic image mapping for new elements
   - Browser-safe initialisation

   DIRECTORY STRUCTURE
   AVERRA_WEBSITE_v1/
   |-- index.html
   |-- about.html
   |-- services.html
   |-- how-it-works.html
   |-- careers.html
   |-- contact.html
   |-- FAQ.html
   |-- style.css
   |-- script.js
   |-- images.js
   |-- images/
       |-- Logo.jpeg
       |-- hero-global-talent.jpg
       |-- about-global-network.jpg
       |-- about-uk-india.jpg
       |-- services-finance-accounting.jpg
       |-- services-operations-admin.jpg
       |-- services-customer-support.jpg
       |-- services-sales-marketing.jpg
       |-- services-it-technology.jpg
       |-- services-engineering.jpg
       |-- services-hr-recruitment.jpg
       |-- services-dedicated-teams.jpg
       |-- industries-finance.jpg
       |-- industries-technology.jpg
       |-- industries-engineering.jpg
       |-- industries-professional-services.jpg
       |-- industries-healthcare.jpg
       |-- industries-ecommerce.jpg
       |-- about-team.jpg
       |-- about-uk-india.jpg
       |-- careers-global-opportunities.jpg

   HTML EXAMPLES

   <img data-image-key="homepage.hero" alt="">

   <img data-image-section="services"
        data-image-name="financeAccounting" alt="">

   <img data-image-logo alt="">

   <div data-image-background="homepage.hero"></div>

   ============================================================ */

(function (window, document) {
    "use strict";

    /* ========================================================
       1. CONFIGURATION
       ======================================================== */

    var AVERRA_IMAGE_CONFIG = {
        version: "7.0",
        basePath: "images/",
        logoFallbackKey: "logo",
        imageTimeout: 10000,
        automaticMapping: true,
        automaticAudit: false,
        liveErrorMonitoring: false,
        missingImageClass: "averra-image-missing",
        fallbackAlt: "AVERRA Staffing Solutions Ltd",
        preserveExistingSrc: false,
        observeDynamicElements: false
    };


    /* ========================================================
       2. CENTRAL IMAGE CATALOGUE
       Existing filenames and catalogue keys are preserved.
       ======================================================== */

    var imageData = {
        version: "7.0",

        logo: {
            file: "Logo.jpeg",
            alt: "AVERRA Staffing Solutions Ltd logo"
        },

        homepage: {
            hero: {
                file: "hero-global-talent.jpg",
                alt: "Global professionals connecting businesses"
            },
            globalTeam: {
                file: "global-team.jpg",
                alt: "Professionals collaborating across borders"
            },
            businessProfessionals: {
                file: "business-professionals.jpg",
                alt: "Business professionals collaborating"
            },
            employeeVirtual: {
                file: "employee-v-virtual.png",
                alt: "Traditional employees and virtual professionals"
            },
            globalNetwork: {
                file: "about-global-network.jpg",
                alt: "International professional network"
            }
        },

        about: {
            globalNetwork: {
                file: "about-global-network.jpg",
                alt: "AVERRA global professional network"
            },
            ukIndia: {
                file: "about-uk-india.jpg",
                alt: "Business connection between the UK and India"
            },
            team: {
                file: "about-team.jpg",
                alt: "Professionals working together"
            },
            globalTeam: {
                file: "global-team.jpg",
                alt: "Global professionals working together"
            },
            businessProfessionals: {
                file: "business-professionals.jpg",
                alt: "Business professionals in a modern workplace"
            }
        },

        services: {
            financeAccounting: {
                file: "services-finance-accounting.jpg",
                alt: "Finance and accounting professionals"
            },
            operationsAdmin: {
                file: "services-operations-admin.jpg",
                alt: "Business operations and administrative support"
            },
            customerSupport: {
                file: "services-customer-support.jpg",
                alt: "Customer support professional"
            },
            salesMarketing: {
                file: "services-sales-marketing.jpg",
                alt: "Sales and marketing professionals"
            },
            itTechnology: {
                file: "services-it-technology.jpg",
                alt: "IT and technology professionals"
            },
            engineering: {
                file: "services-engineering.jpg",
                alt: "Engineering and technical professionals"
            },
            hrRecruitment: {
                file: "services-hr-recruitment.jpg",
                alt: "Human resources and recruitment"
            },
            dedicatedTeams: {
                file: "services-dedicated-teams.jpg",
                alt: "Dedicated remote professional teams"
            },
            finance: {
                file: "finance.jpg",
                alt: "Finance and accounting services"
            },
            financeOffice: {
                file: "finance-office.png",
                alt: "Finance office environment"
            },
            financeVirtualReality: {
                file: "finance-virtual-reality.jpg",
                alt: "Digital technology in finance"
            },
            virtualFinance: {
                file: "Virtual-finance-2.jpg",
                alt: "Virtual finance services"
            }
        },

        industries: {
            finance: {
                file: "industries-finance.jpg",
                alt: "Finance industry"
            },
            technology: {
                file: "industries-technology.jpg",
                alt: "Technology industry"
            },
            engineering: {
                file: "industries-engineering.jpg",
                alt: "Engineering industry"
            },
            professionalServices: {
                file: "industries-professional-services.jpg",
                alt: "Professional services"
            },
            healthcare: {
                file: "industries-healthcare.jpg",
                alt: "Healthcare industry"
            },
            ecommerce: {
                file: "industries-ecommerce.jpg",
                alt: "E-commerce business"
            },
            architecture: {
                file: "architecture1.jpg",
                alt: "Architecture and design"
            }
        },

        howItWorks: {
            globalNetwork: {
                file: "about-global-network.jpg",
                alt: "Global network connecting businesses and talent"
            },
            ukIndia: {
                file: "about-uk-india.jpg",
                alt: "UK and India business connection"
            },
            meetings: {
                file: "meetings professional.jpg",
                alt: "Professionals discussing business requirements"
            },
            virtualMeetings: {
                file: "virtual-meetings.jpg",
                alt: "Remote team collaboration"
            },
            location: {
                file: "location.jpg",
                alt: "Business location information"
            },
            locationAlternative: {
                file: "location2.jpg",
                alt: "International business location"
            }
        },

        careers: {
            globalOpportunities: {
                file: "career-global-opportunities.jpg",
                alt: "International professional opportunities"
            },
            globalTeam: {
                file: "global-team.jpg",
                alt: "Global team of professionals"
            },
            team: {
                file: "about-team.jpg",
                alt: "Professionals collaborating"
            }
        },

        contact: {
            email: {
                file: "email2.png",
                alt: "Email contact"
            },
            message: {
                file: "message.png",
                alt: "Contact AVERRA by message"
            },
            location: {
                file: "location.jpg",
                alt: "Business location"
            },
            locationAlternative: {
                file: "location2.jpg",
                alt: "Office location information"
            },
            registeredOffice: {
                file: "registered-office.png",
                alt: "Registered office information"
            }
        },

        faq: {
            questions: {
                file: "frequent-questions.jpg",
                alt: "Frequently asked questions"
            },
            businessProfessionals: {
                file: "business-professionals.jpg",
                alt: "Business professionals discussing solutions"
            }
        },

        business: {
            globalTeam: {
                file: "global-team.jpg",
                alt: "Global business team"
            },
            businessProfessionals: {
                file: "business-professionals.jpg",
                alt: "Business professionals"
            },
            teamMeetings: {
                file: "meetings professional.jpg",
                alt: "Professional business meeting"
            },
            meetingsProfessional: {
                file: "meetings professional.jpg",
                alt: "Professionals discussing business priorities"
            },
            virtualMeetings: {
                file: "virtual-meetings.jpg",
                alt: "Virtual business meeting"
            },
            virtualCalls: {
                file: "virtuals calls.jpg",
                alt: "Virtual calls between professionals"
            },
            virtualCall: {
                file: "virtual-call.jpg",
                alt: "Remote professional on a virtual call"
            }
        },

        workplace: {
            meetings: {
                file: "meetings professional.jpg",
                alt: "Professional meeting"
            },
            virtualOffice: {
                file: "virtual-office.png",
                alt: "Virtual office environment"
            },
            virtualOfficeAlternative: {
                file: "virtualOffice.jpg",
                alt: "Virtual workplace"
            },
            virtualImage: {
                file: "virtual-image.jpg",
                alt: "Digital working environment"
            },
            remoteWorker: {
                file: "remote-worker.png",
                alt: "Remote professional working online"
            },
            office: {
                file: "images.jpg",
                alt: "Office environment"
            }
        },

        architecture: {
            architecture1: {
                file: "architecture1.jpg",
                alt: "Architecture and design"
            },
            architecture2: {
                file: "architecture2.jpg",
                alt: "Architectural planning"
            },
            architecture3: {
                file: "architecture3.jpg",
                alt: "Architectural technical design"
            },
            architecture5: {
                file: "architecture5.jpg",
                alt: "Professional architectural work"
            }
        },

        communication: {
            email: {
                file: "email2.png",
                alt: "Email communication"
            },
            message: {
                file: "message.png",
                alt: "Business message"
            },
            virtualCalls: {
                file: "virtuals calls.jpg",
                alt: "Virtual professional communication"
            },
            virtualCall: {
                file: "virtual-call.jpg",
                alt: "Virtual business call"
            },
            virtualMeetings: {
                file: "virtual-meetings.jpg",
                alt: "Virtual meeting"
            }
        },

        general: {
            logo: {
                file: "Logo.jpeg",
                alt: "AVERRA Staffing Solutions Ltd logo"
            },
            registeredOffice: {
                file: "registered-office.png",
                alt: "Registered office"
            },
            globalTeam: {
                file: "global-team.jpg",
                alt: "Global team"
            },
            businessProfessionals: {
                file: "business-professionals.jpg",
                alt: "Business professionals"
            }
        }
    };


    /* ========================================================
       3. GENERAL UTILITIES
       ======================================================== */

    function isObject(value) {
        return value !== null &&
            typeof value === "object" &&
            !Array.isArray(value);
    }

    function normaliseKey(value) {
        return String(value || "")
            .trim()
            .replace(/^\/+|\/+$/g, "");
    }

    function isValidImageFilename(filename) {
        if (typeof filename !== "string") {
            return false;
        }

        var value = filename.trim();

        if (!value ||
            value.indexOf("..") !== -1 ||
            value.indexOf("/") !== -1 ||
            value.indexOf("\\") !== -1 ||
            /[\u0000-\u001f]/.test(value) ||
            /^[a-z][a-z0-9+.-]*:/i.test(value)) {
            return false;
        }

        return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(value);
    }

    function getEntryFilename(entry) {
        if (typeof entry === "string") {
            return entry;
        }

        if (isObject(entry)) {
            return entry.file || entry.filename || entry.src || "";
        }

        return "";
    }

    function getEntryAlt(entry) {
        return isObject(entry)
            ? String(entry.alt || entry.title || "")
            : "";
    }

    function getBasePath() {
        var path = String(
            AVERRA_IMAGE_CONFIG.basePath || "images/"
        ).trim();

        if (!path) {
            path = "images/";
        }

        return path.endsWith("/") ? path : path + "/";
    }

    function encodeFilename(filename) {
        return encodeURIComponent(filename);
    }

    function getAllCatalogueEntries(source) {
        var results = [];

        function walk(value, keyPath) {
            if (!isObject(value)) {
                return;
            }

            if (getEntryFilename(value)) {
                results.push({
                    key: keyPath,
                    file: getEntryFilename(value),
                    alt: getEntryAlt(value),
                    entry: value
                });
                return;
            }

            Object.keys(value).forEach(function (key) {
                walk(
                    value[key],
                    keyPath ? keyPath + "." + key : key
                );
            });
        }

        walk(source || imageData, "");

        return results;
    }

    function safeLog(method, message, details) {
        if (!window.console ||
            typeof window.console[method] !== "function") {
            return;
        }

        if (typeof details === "undefined") {
            window.console[method](message);
        } else {
            window.console[method](message, details);
        }
    }


    /* ========================================================
       4. IMAGE LOOKUP FUNCTIONS
       ======================================================== */

    function getImageByPath(path) {
        var key = normaliseKey(path);

        if (!key) {
            return null;
        }

        if (isValidImageFilename(key)) {
            return {
                file: key,
                alt: ""
            };
        }

        var parts = key.split(".");
        var current = imageData;

        for (var i = 0; i < parts.length; i++) {
            if (!isObject(current) ||
                !Object.prototype.hasOwnProperty.call(
                    current,
                    parts[i]
                )) {
                current = null;
                break;
            }

            current = current[parts[i]];
        }

        if (typeof current === "string") {
            return {
                file: current,
                alt: ""
            };
        }

        if (isObject(current) && getEntryFilename(current)) {
            return current;
        }

        var entries = getAllCatalogueEntries(imageData);

        for (var j = 0; j < entries.length; j++) {
            if (entries[j].key === key ||
                entries[j].file === key) {
                return entries[j].entry;
            }
        }

        return null;
    }

    function getImageByKey(section, key) {
        if (typeof key === "undefined" ||
            key === null ||
            key === "") {
            return getImageByPath(section);
        }

        return getImageByPath(
            normaliseKey(section) + "." + normaliseKey(key)
        );
    }

    function getImage(image) {
        if (isObject(image) && getEntryFilename(image)) {
            return image;
        }

        return getImageByPath(image);
    }

    function getImagePath(image) {
        var entry = getImage(image);

        if (!entry) {
            return "";
        }

        var filename = getEntryFilename(entry);

        if (!isValidImageFilename(filename)) {
            return "";
        }

        return getBasePath() + encodeFilename(filename);
    }

    function getImageUrl(image, key) {
        var entry;

        if (typeof key !== "undefined" && key !== null) {
            entry = getImageByKey(image, key);
        } else {
            entry = getImage(image);
        }

        return entry ? getImagePath(entry) : "";
    }

    function getImageAlt(image, fallback) {
        var alt = getEntryAlt(getImage(image));

        return alt || fallback || "";
    }

    function getImagesBySection(section) {
        var key = normaliseKey(section);

        if (!Object.prototype.hasOwnProperty.call(imageData, key)) {
            return {};
        }

        return imageData[key];
    }


    /* ========================================================
       5. IMAGE INVENTORY AND DUPLICATES
       ======================================================== */

    function getImageInventory() {
        return getAllCatalogueEntries(imageData).map(function (item) {
            return {
                key: item.key,
                filename: item.file,
                path: getImagePath(item.entry),
                alt: item.alt,
                validFilename: isValidImageFilename(item.file)
            };
        });
    }

    function getUniqueImages() {
        var seen = Object.create(null);
        var results = [];

        getImageInventory().forEach(function (item) {
            if (!Object.prototype.hasOwnProperty.call(
                seen,
                item.filename
            )) {
                seen[item.filename] = true;
                results.push(item);
            }
        });

        return results;
    }

    function getDuplicateImages() {
        var groups = Object.create(null);

        getImageInventory().forEach(function (item) {
            if (!groups[item.filename]) {
                groups[item.filename] = [];
            }

            groups[item.filename].push(item.key);
        });

        return Object.keys(groups)
            .filter(function (filename) {
                return groups[filename].length > 1;
            })
            .map(function (filename) {
                return {
                    filename: filename,
                    count: groups[filename].length,
                    keys: groups[filename]
                };
            });
    }

    function getImageList() {
        return getImageInventory();
    }

    function getImageCatalogue() {
        return imageData;
    }

    function findDuplicateImages() {
        return getDuplicateImages();
    }


    /* ========================================================
       6. CATALOGUE VALIDATION
       ======================================================== */

    function validateImageCatalogue() {
        var inventory = getImageInventory();

        var invalidFilenames = inventory.filter(function (item) {
            return !item.validFilename;
        });

        var missingAltText = inventory.filter(function (item) {
            return !item.alt.trim();
        });

        return {
            valid: invalidFilenames.length === 0 &&
                missingAltText.length === 0,
            totalReferences: inventory.length,
            uniqueFiles: getUniqueImages().length,
            invalidFilenames: invalidFilenames,
            missingAltText: missingAltText,
            duplicates: getDuplicateImages()
        };
    }


    /* ========================================================
       7. APPLY IMAGES TO HTML
       ======================================================== */

    function markImageAsMissing(element, reason) {
        if (!element) {
            return;
        }

        element.setAttribute(
            "data-image-error",
            reason || "missing"
        );

        if (element.classList) {
            element.classList.add(
                AVERRA_IMAGE_CONFIG.missingImageClass
            );
        }
    }

    function clearImageError(element) {
        if (!element) {
            return;
        }

        element.removeAttribute("data-image-error");

        if (element.classList) {
            element.classList.remove(
                AVERRA_IMAGE_CONFIG.missingImageClass
            );
        }
    }

    function resolveElementImageKey(element) {
        var key = element.getAttribute("data-image-key");

        if (key) {
            return normaliseKey(key);
        }

        var section = element.getAttribute("data-image-section");
        var name = element.getAttribute("data-image-name");

        if (section && name) {
            return normaliseKey(section) + "." + normaliseKey(name);
        }

        if (section) {
            return normaliseKey(section);
        }

        if (element.hasAttribute("data-image-logo")) {
            var logoKey = element.getAttribute("data-image-logo");

            if (logoKey &&
                logoKey !== "true" &&
                logoKey !== "1") {
                return normaliseKey(logoKey);
            }

            return AVERRA_IMAGE_CONFIG.logoFallbackKey;
        }

        if (element.hasAttribute("data-image-background")) {
            return normaliseKey(
                element.getAttribute("data-image-background")
            );
        }

        return "";
    }

    function applyImageToElement(element) {
        if (!element || !element.getAttribute) {
            return {
                success: false,
                reason: "Invalid element"
            };
        }

        var key = resolveElementImageKey(element);

        if (!key) {
            return {
                success: false,
                reason: "No image key supplied"
            };
        }

        var entry = getImageByPath(key);

        if (!entry) {
            markImageAsMissing(element, "catalogue-key-not-found");

            return {
                success: false,
                key: key,
                reason: "Image key not found"
            };
        }

        var path = getImagePath(entry);

        if (!path) {
            markImageAsMissing(element, "invalid-filename");

            return {
                success: false,
                key: key,
                reason: "Invalid filename"
            };
        }

        var tagName = element.tagName
            ? element.tagName.toLowerCase()
            : "";

        var customAlt = element.getAttribute("data-image-alt");
        var catalogueAlt = getEntryAlt(entry);

        if (tagName === "img") {
            var existingSrc = element.getAttribute("src");

            if (AVERRA_IMAGE_CONFIG.preserveExistingSrc &&
                existingSrc &&
                !element.hasAttribute("data-image-force")) {
                return {
                    success: true,
                    key: key,
                    filename: getEntryFilename(entry),
                    path: existingSrc,
                    preservedExistingSrc: true
                };
            }

            element.setAttribute("src", path);

            if (customAlt !== null) {
                element.setAttribute("alt", customAlt);
            } else if (!element.hasAttribute("alt") ||
                !element.getAttribute("alt").trim()) {
                element.setAttribute(
                    "alt",
                    catalogueAlt || AVERRA_IMAGE_CONFIG.fallbackAlt
                );
            }

            if (!element.hasAttribute("loading") &&
                !element.hasAttribute("data-image-eager")) {
                element.setAttribute("loading", "lazy");
            }

            if (!element.hasAttribute("decoding")) {
                element.setAttribute("decoding", "async");
            }

            element.addEventListener("load", function () {
                clearImageError(element);
            }, { once: true });

            element.addEventListener("error", function () {
                markImageAsMissing(element, "browser-load-error");
            }, { once: true });

        } else {
            element.style.backgroundImage =
                'url("' + path.replace(/["\\]/g, "\\$&") + '")';

            if (customAlt || catalogueAlt) {
                element.setAttribute(
                    "aria-label",
                    customAlt || catalogueAlt
                );
            }
        }

        clearImageError(element);

        return {
            success: true,
            key: key,
            filename: getEntryFilename(entry),
            path: path
        };
    }

    function applyImages(root) {
        var scope = root || document;

        if (!scope.querySelectorAll) {
            return {
                total: 0,
                successful: 0,
                failed: 0,
                results: []
            };
        }

        var selector = [
            "[data-image-key]",
            "[data-image-section]",
            "[data-image-logo]",
            "[data-image-background]"
        ].join(",");

        var elements = [];

        if (scope.matches && scope.matches(selector)) {
            elements.push(scope);
        }

        Array.prototype.push.apply(
            elements,
            Array.prototype.slice.call(
                scope.querySelectorAll(selector)
            )
        );

        var results = elements.map(function (element) {
            return applyImageToElement(element);
        });

        var successful = results.filter(function (result) {
            return result.success;
        }).length;

        return {
            total: results.length,
            successful: successful,
            failed: results.length - successful,
            results: results
        };
    }


    /* ========================================================
       8. CHECK WHETHER IMAGE FILES LOAD
       ======================================================== */

    function validateImageFile(path, timeout) {
        return new Promise(function (resolve) {
            if (!path) {
                resolve({
                    valid: false,
                    path: path,
                    reason: "empty-path"
                });
                return;
            }

            var image = new window.Image();
            var completed = false;

            var duration = Number(timeout) ||
                AVERRA_IMAGE_CONFIG.imageTimeout;

            var timer = window.setTimeout(function () {
                finish({
                    valid: false,
                    path: path,
                    reason: "timeout"
                });
            }, duration);

            function finish(result) {
                if (completed) {
                    return;
                }

                completed = true;
                window.clearTimeout(timer);
                image.onload = null;
                image.onerror = null;
                resolve(result);
            }

            image.onload = function () {
                finish({
                    valid: true,
                    path: path,
                    width: image.naturalWidth,
                    height: image.naturalHeight
                });
            };

            image.onerror = function () {
                finish({
                    valid: false,
                    path: path,
                    reason: "load-error"
                });
            };

            image.src = path;
        });
    }

    function validateImages(options) {
        var settings = options || {};
        var timeout = settings.timeout ||
            AVERRA_IMAGE_CONFIG.imageTimeout;

        var inventory = settings.uniqueOnly === false
            ? getImageInventory()
            : getUniqueImages();

        var tasks = inventory.map(function (item) {
            if (!item.validFilename) {
                return Promise.resolve({
                    valid: false,
                    key: item.key,
                    filename: item.filename,
                    path: item.path,
                    reason: "invalid-filename"
                });
            }

            return validateImageFile(item.path, timeout)
                .then(function (result) {
                    result.key = item.key;
                    result.filename = item.filename;
                    return result;
                });
        });

        return Promise.all(tasks).then(function (results) {
            var valid = results.filter(function (item) {
                return item.valid;
            });

            var invalid = results.filter(function (item) {
                return !item.valid;
            });

            return {
                total: results.length,
                validCount: valid.length,
                invalidCount: invalid.length,
                valid: valid,
                invalid: invalid,
                results: results
            };
        });
    }


    /* ========================================================
       9. PAGE IMAGE AUDIT
       ======================================================== */

    function auditPageImages(options) {
        var settings = options || {};
        var root = settings.root || document;

        var mapping = settings.applyMapping === false
            ? null
            : applyImages(root);

        var images = root.querySelectorAll
            ? Array.prototype.slice.call(
                root.querySelectorAll("img")
            )
            : [];

        if (root.matches &&
            root.matches("img")) {
            images.unshift(root);
        }

        var missingSrc = [];
        var missingAlt = [];
        var emptyAlt = [];
        var brokenImages = [];
        var pendingImages = [];

        images.forEach(function (img) {
            var src = img.getAttribute("src");

            if (!src || !src.trim()) {
                missingSrc.push({
                    id: img.id || "",
                    src: src || ""
                });
            }

            if (!img.hasAttribute("alt")) {
                missingAlt.push({
                    id: img.id || "",
                    src: src || ""
                });
            } else if (!img.getAttribute("alt").trim()) {
                emptyAlt.push({
                    id: img.id || "",
                    src: src || ""
                });
            }

            if (src && !img.complete) {
                pendingImages.push({
                    id: img.id || "",
                    src: src
                });
            } else if (src && img.complete &&
                img.naturalWidth === 0) {
                brokenImages.push({
                    id: img.id || "",
                    src: src
                });
            }
        });

        var catalogue = validateImageCatalogue();

        return {
            timestamp: new Date().toISOString(),
            page: document.location
                ? document.location.pathname
                : "",
            catalogue: {
                totalReferences: catalogue.totalReferences,
                uniqueFiles: catalogue.uniqueFiles,
                invalidFilenames: catalogue.invalidFilenames,
                missingAltText: catalogue.missingAltText,
                duplicates: catalogue.duplicates
            },
            pageImages: {
                total: images.length,
                missingSrc: missingSrc,
                missingAlt: missingAlt,
                emptyAlt: emptyAlt,
                brokenImages: brokenImages,
                pendingImages: pendingImages
            },
            mapping: mapping
        };
    }

    function auditImages(options) {
        return auditPageImages(options);
    }


    /* ========================================================
       10. LIVE IMAGE ERROR MONITORING
       ======================================================== */

    function monitorImageErrors(root) {
        var scope = root || document;

        function handleError(event) {
            var target = event.target;

            if (!target ||
                !target.tagName ||
                target.tagName.toLowerCase() !== "img") {
                return;
            }

            markImageAsMissing(target, "browser-load-error");

            safeLog(
                "warn",
                "[AVERRA] Image failed to load:",
                target.currentSrc || target.src
            );
        }

        scope.addEventListener("error", handleError, true);

        return function stopMonitoring() {
            scope.removeEventListener("error", handleError, true);
        };
    }


    /* ========================================================
       11. ALT-TEXT REPAIR
       ======================================================== */

    function repairImageAltText(root) {
        var scope = root || document;
        var repaired = 0;

        if (!scope.querySelectorAll) {
            return repaired;
        }

        var images = Array.prototype.slice.call(
            scope.querySelectorAll("img")
        );

        if (scope.matches && scope.matches("img")) {
            images.unshift(scope);
        }

        images.forEach(function (img) {
            if (img.hasAttribute("alt")) {
                return;
            }

            var key = resolveElementImageKey(img);
            var entry = key ? getImageByPath(key) : null;

            img.setAttribute(
                "alt",
                getEntryAlt(entry)
            );

            repaired += 1;
        });

        return repaired;
    }


    /* ========================================================
       12. JSON EXPORT AND DOWNLOAD
       ======================================================== */

    function exportImageInventory() {
        return JSON.stringify(
            getImageInventory(),
            null,
            2
        );
    }

    function exportImageAudit() {
        return JSON.stringify(
            auditPageImages({ log: false }),
            null,
            2
        );
    }

    function downloadTextFile(filename, content, mimeType) {
        var blob = new Blob(
            [content],
            {
                type: mimeType || "text/plain;charset=utf-8"
            }
        );

        var url = window.URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(function () {
            window.URL.revokeObjectURL(url);
        }, 1000);
    }

    function downloadImageInventory() {
        downloadTextFile(
            "averra-image-inventory.json",
            exportImageInventory(),
            "application/json;charset=utf-8"
        );
    }

    function downloadImageAudit() {
        downloadTextFile(
            "averra-image-audit.json",
            exportImageAudit(),
            "application/json;charset=utf-8"
        );
    }


    /* ========================================================
       13. DYNAMIC ELEMENT SUPPORT
       ======================================================== */

    var dynamicObserver = null;

    function observeDynamicImages() {
        if (!AVERRA_IMAGE_CONFIG.observeDynamicElements ||
            !window.MutationObserver ||
            !document.body ||
            dynamicObserver) {
            return false;
        }

        dynamicObserver = new window.MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(
                    mutation.addedNodes,
                    function (node) {
                        if (node.nodeType !== 1) {
                            return;
                        }

                        applyImages(node);
                    }
                );
            });
        });

        dynamicObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        return true;
    }

    function stopObservingDynamicImages() {
        if (dynamicObserver) {
            dynamicObserver.disconnect();
            dynamicObserver = null;
        }
    }


    /* ========================================================
       14. INITIALISATION
       ======================================================== */

    var lastMappingResult = null;
    var stopMonitoring = null;
    var initialised = false;

    function initialiseImages() {
        if (initialised) {
            return lastMappingResult;
        }

        initialised = true;

        if (AVERRA_IMAGE_CONFIG.automaticMapping) {
            lastMappingResult = applyImages(document);
        }

        if (AVERRA_IMAGE_CONFIG.liveErrorMonitoring &&
            !stopMonitoring) {
            stopMonitoring = monitorImageErrors(document);
        }

        if (AVERRA_IMAGE_CONFIG.observeDynamicElements) {
            observeDynamicImages();
        }

        if (AVERRA_IMAGE_CONFIG.automaticAudit) {
            safeLog(
                "group",
                "[AVERRA] Image Audit"
            );

            safeLog(
                "log",
                "Page audit:",
                auditPageImages({ log: false })
            );

            if (window.console &&
                typeof window.console.groupEnd === "function") {
                window.console.groupEnd();
            }
        }

        return lastMappingResult;
    }


    /* ========================================================
       15. PUBLIC API
       ======================================================== */

    var AVERRA_IMAGES = {
        config: AVERRA_IMAGE_CONFIG,
        catalogue: imageData,

        getImage: getImage,
        getImageByKey: getImageByKey,
        getImageByPath: getImageByPath,
        getImageUrl: getImageUrl,
        getImagePath: getImagePath,
        getImageAlt: getImageAlt,
        getImagesBySection: getImagesBySection,

        getImageInventory: getImageInventory,
        getImageList: getImageList,
        getImageCatalogue: getImageCatalogue,
        getUniqueImages: getUniqueImages,
        getDuplicateImages: getDuplicateImages,
        findDuplicateImages: findDuplicateImages,

        validateImageCatalogue: validateImageCatalogue,
        validateImageFile: validateImageFile,
        validateImages: validateImages,

        applyImageToElement: applyImageToElement,
        applyImages: applyImages,

        auditImages: auditImages,
        auditPageImages: auditPageImages,
        monitorImageErrors: monitorImageErrors,
        repairImageAltText: repairImageAltText,

        exportImageInventory: exportImageInventory,
        exportImageAudit: exportImageAudit,
        downloadImageInventory: downloadImageInventory,
        downloadImageAudit: downloadImageAudit,

        initialiseImages: initialiseImages,
        observeDynamicImages: observeDynamicImages,
        stopObservingDynamicImages: stopObservingDynamicImages,

        getLastMappingResult: function () {
            return lastMappingResult;
        },

        stopImageMonitoring: function () {
            if (stopMonitoring) {
                stopMonitoring();
                stopMonitoring = null;
            }
        }
    };


    /* ========================================================
       16. BACKWARDS-COMPATIBLE GLOBAL EXPORTS
       ======================================================== */

    window.imageData = imageData;
    window.AVERRA_IMAGES = AVERRA_IMAGES;

    window.getImage = getImage;
    window.getImageByKey = getImageByKey;
    window.getImageByPath = getImageByPath;
    window.getImageUrl = getImageUrl;
    window.getImagePath = getImagePath;
    window.getImageAlt = getImageAlt;
    window.getImagesBySection = getImagesBySection;

    window.getImageInventory = getImageInventory;
    window.getImageList = getImageList;
    window.getImageCatalogue = getImageCatalogue;
    window.getUniqueImages = getUniqueImages;
    window.getDuplicateImages = getDuplicateImages;
    window.findDuplicateImages = findDuplicateImages;

    window.validateImageCatalogue = validateImageCatalogue;
    window.validateImages = validateImages;

    window.applyImageToElement = applyImageToElement;
    window.applyImages = applyImages;

    window.auditImages = auditImages;
    window.auditPageImages = auditPageImages;
    window.monitorImageErrors = monitorImageErrors;
    window.repairImageAltText = repairImageAltText;

    window.exportImageInventory = exportImageInventory;
    window.exportImageAudit = exportImageAudit;
    window.downloadImageInventory = downloadImageInventory;
    window.downloadImageAudit = downloadImageAudit;

    window.initialiseAverraImages = initialiseImages;


    /* ========================================================
       17. START WHEN THE PAGE IS READY
       ======================================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseImages,
            { once: true }
        );
    } else {
        initialiseImages();
    }

})(window, document);