
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   JOBS MANAGEMENT SYSTEM
   File: frontend/images/jobs.js
   Version: 2.0
   ============================================================

   FEATURES
   - Central vacancy catalogue
   - Search and category filtering
   - Responsive job-card rendering
   - Accessible application interactions
   - Application form validation
   - Email application draft generation
   - Mobile navigation support
   - Footer year management
   - Public AVERRAJobs API
   - Safe DOM rendering
   - No external dependencies

   IMPORTANT
   Applications are prepared in the applicant's email client.
   This file does not send emails or store applications.
   ============================================================ */

(function () {
    "use strict";

    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = Object.freeze({
        company: "AVERRA Staffing Solutions Ltd",
        email: "info@averrastaffing.co.uk",
        defaultCategory: "all",
        successMessage:
            "Your email application draft is ready. Please send it from your email application to complete your submission.",
        emailFallbackMessage:
            "Your application details are ready, but your email application could not be opened automatically. Please email info@averrastaffing.co.uk."
    });

    /* --------------------------------------------------------
       VACANCY CATALOGUE

       Edit this list to add, update or remove job adverts.

       Set published: false to hide a vacancy without deleting
       its information.
       -------------------------------------------------------- */

    const VACANCIES = [
        {
            id: "finance-assistant",
            title: "Finance Assistant",
            category: "finance",
            location: "Remote",
            type: "Full-time",
            description:
                "Support finance operations, financial reporting, reconciliations and administrative processes for UK businesses.",
            skills: [
                "Excel",
                "Financial administration",
                "Attention to detail"
            ],
            published: true
        },
        {
            id: "frontend-developer",
            title: "Front-End Developer",
            category: "technology",
            location: "Remote",
            type: "Full-time",
            description:
                "Help develop and maintain responsive websites and user interfaces using modern front-end technologies.",
            skills: [
                "HTML",
                "CSS",
                "JavaScript"
            ],
            published: true
        },
        {
            id: "customer-support",
            title: "Customer Support Specialist",
            category: "customer-service",
            location: "Remote",
            type: "Full-time",
            description:
                "Assist customers with enquiries, maintain accurate records and deliver professional customer service.",
            skills: [
                "Communication",
                "Problem-solving",
                "Customer service"
            ],
            published: true
        },
        {
            id: "virtual-assistant",
            title: "Virtual Assistant",
            category: "administration",
            location: "Remote",
            type: "Full-time",
            description:
                "Support daily business activities through scheduling, email management, research and administrative tasks.",
            skills: [
                "Organisation",
                "Microsoft Office",
                "Time management"
            ],
            published: true
        },
        {
            id: "sales-marketing",
            title: "Sales and Marketing Assistant",
            category: "marketing",
            location: "Remote",
            type: "Full-time",
            description:
                "Support lead generation, market research, prospect communications and digital marketing activities.",
            skills: [
                "Communication",
                "Market research",
                "CRM systems"
            ],
            published: true
        },
        {
            id: "recruitment-assistant",
            title: "Recruitment Assistant",
            category: "human-resources",
            location: "Remote",
            type: "Full-time",
            description:
                "Assist with candidate sourcing, CV screening, interview coordination and recruitment administration.",
            skills: [
                "Organisation",
                "Communication",
                "Candidate coordination"
            ],
            published: true
        }
    ];

    const CATEGORY_LABELS = Object.freeze({
        finance: "Finance",
        technology: "Technology",
        "customer-service": "Customer Service",
        administration: "Administration",
        marketing: "Sales & Marketing",
        "human-resources": "Human Resources"
    });

    /* --------------------------------------------------------
       APPLICATION
       -------------------------------------------------------- */

    const JobsApp = {
        elements: {},
        initialized: false,

        init: function () {
            if (this.initialized) {
                return;
            }

            this.initialized = true;

            if (document.readyState === "loading") {
                document.addEventListener(
                    "DOMContentLoaded",
                    () => this.start(),
                    { once: true }
                );
            } else {
                this.start();
            }
        },

        start: function () {
            this.cacheElements();
            this.setupMobileNavigation();
            this.setupFilters();
            this.setupApplicationButtons();
            this.setupApplicationForm();
            this.renderVacancies();
            this.setFooterYear();
        },

        /* ----------------------------------------------------
           ELEMENT REFERENCES
           ---------------------------------------------------- */

        cacheElements: function () {
            this.elements.search =
                document.getElementById("job-search");

            this.elements.category =
                document.getElementById("job-category");

            this.elements.grid =
                document.getElementById("jobs-grid");

            this.elements.count =
                document.getElementById("jobs-count");

            this.elements.empty =
                document.getElementById("no-jobs");

            this.elements.reset =
                document.getElementById("reset-jobs");

            this.elements.form =
                document.getElementById("job-application-form");

            this.elements.role =
                document.getElementById("application-role");

            this.elements.message =
                document.getElementById("application-message");

            this.elements.applicationSection =
                document.getElementById("job-application");

            this.elements.menuToggle =
                document.getElementById("menu-toggle");

            this.elements.navigation =
                document.getElementById("main-navigation");

            this.elements.year =
                document.getElementById("current-year");
        },

        /* ----------------------------------------------------
           FOOTER
           ---------------------------------------------------- */

        setFooterYear: function () {
            if (this.elements.year) {
                this.elements.year.textContent =
                    String(new Date().getFullYear());
            }
        },

        /* ----------------------------------------------------
           MOBILE NAVIGATION
           ---------------------------------------------------- */

        setupMobileNavigation: function () {
            const toggle = this.elements.menuToggle;
            const navigation = this.elements.navigation;

            if (!toggle || !navigation) {
                return;
            }

            toggle.addEventListener("click", function () {
                const isOpen =
                    navigation.classList.toggle("is-open");

                toggle.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );
            });

            navigation.querySelectorAll("a").forEach(
                function (link) {
                    link.addEventListener("click", function () {
                        navigation.classList.remove("is-open");

                        toggle.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    });
                }
            );

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    navigation.classList.remove("is-open");

                    toggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            });
        },

        /* ----------------------------------------------------
           FILTERS
           ---------------------------------------------------- */

        setupFilters: function () {
            const search = this.elements.search;
            const category = this.elements.category;
            const reset = this.elements.reset;

            if (search) {
                search.addEventListener(
                    "input",
                    () => this.filterVacancies()
                );
            }

            if (category) {
                category.addEventListener(
                    "change",
                    () => this.filterVacancies()
                );
            }

            if (reset) {
                reset.addEventListener("click", () => {
                    if (search) {
                        search.value = "";
                    }

                    if (category) {
                        category.value = CONFIG.defaultCategory;
                    }

                    this.filterVacancies();

                    if (search) {
                        search.focus();
                    }
                });
            }
        },

        /* ----------------------------------------------------
           RENDER JOBS
           ---------------------------------------------------- */

        renderVacancies: function () {
            const grid = this.elements.grid;

            if (!grid) {
                console.warn(
                    "AVERRA Jobs: The page needs an element with id=\"jobs-grid\"."
                );
                return;
            }

            const publishedJobs = VACANCIES.filter(
                function (job) {
                    return job.published === true;
                }
            );

            const fragment = document.createDocumentFragment();

            publishedJobs.forEach((job) => {
                fragment.appendChild(this.createJobCard(job));
            });

            grid.replaceChildren(fragment);

            this.filterVacancies();
        },

        /* ----------------------------------------------------
           CREATE JOB CARD
           ---------------------------------------------------- */

        createJobCard: function (job) {
            const article = document.createElement("article");

            article.className = "job-card";
            article.dataset.jobId = job.id;
            article.dataset.category = job.category;

            const top = document.createElement("div");
            top.className = "job-card-top";

            const badge = document.createElement("span");
            badge.className = "job-category";
            badge.textContent = this.formatCategory(job.category);

            const location = document.createElement("span");
            location.className = "job-location";
            location.textContent = job.location;

            top.append(badge, location);

            const title = document.createElement("h3");
            title.textContent = job.title;

            const type = document.createElement("p");
            type.className = "job-type";
            type.textContent = job.type;

            const description = document.createElement("p");
            description.className = "job-description";
            description.textContent = job.description;

            const skillsHeading = document.createElement("p");
            skillsHeading.className = "job-skills-heading";
            skillsHeading.textContent = "Key skills";

            const skills = document.createElement("ul");
            skills.className = "job-skills";

            job.skills.forEach(function (skill) {
                const item = document.createElement("li");
                item.textContent = skill;
                skills.appendChild(item);
            });

            const button = document.createElement("button");
            button.type = "button";
            button.className =
                "btn btn-primary apply-job-button";

            button.dataset.jobId = job.id;
            button.dataset.jobTitle = job.title;
            button.textContent = "Apply for this role";
            button.setAttribute(
                "aria-label",
                "Apply for " + job.title
            );

            article.append(
                top,
                title,
                type,
                description,
                skillsHeading,
                skills,
                button
            );

            return article;
        },

        /* ----------------------------------------------------
           CATEGORY LABELS
           ---------------------------------------------------- */

        formatCategory: function (category) {
            return CATEGORY_LABELS[category] || "Professional";
        },

        /* ----------------------------------------------------
           SEARCH AND FILTER
           ---------------------------------------------------- */

        filterVacancies: function () {
            const searchValue = this.elements.search
                ? this.elements.search.value.trim().toLowerCase()
                : "";

            const categoryValue = this.elements.category
                ? this.elements.category.value
                : CONFIG.defaultCategory;

            const cards = this.elements.grid
                ? Array.from(
                    this.elements.grid.querySelectorAll(".job-card")
                )
                : [];

            let visibleCount = 0;

            cards.forEach(function (card) {
                const searchableText =
                    card.textContent.toLowerCase();

                const cardCategory =
                    card.dataset.category || "";

                const matchesSearch =
                    searchableText.includes(searchValue);

                const matchesCategory =
                    categoryValue === CONFIG.defaultCategory ||
                    cardCategory === categoryValue;

                const visible =
                    matchesSearch && matchesCategory;

                card.hidden = !visible;

                if (visible) {
                    visibleCount++;
                }
            });

            if (this.elements.count) {
                this.elements.count.textContent =
                    visibleCount +
                    (visibleCount === 1
                        ? " position found"
                        : " positions found");
            }

            if (this.elements.empty) {
                this.elements.empty.hidden = visibleCount !== 0;
            }

            if (this.elements.grid) {
                this.elements.grid.setAttribute(
                    "aria-busy",
                    "false"
                );
            }
        },

        /* ----------------------------------------------------
           APPLY BUTTONS
           ---------------------------------------------------- */

        setupApplicationButtons: function () {
            document.addEventListener("click", (event) => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const button = target.closest(".apply-job-button");

                if (!button) {
                    return;
                }

                const jobId = button.dataset.jobId || "";

                const job = VACANCIES.find(function (item) {
                    return item.id === jobId &&
                        item.published === true;
                });

                if (!job) {
                    this.showMessage(
                        "This vacancy is no longer available. Please check the current vacancies.",
                        "error"
                    );
                    return;
                }

                if (this.elements.role) {
                    this.elements.role.value = job.title;
                }

                const destination =
                    this.elements.applicationSection ||
                    this.elements.form;

                if (destination) {
                    destination.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

                if (this.elements.role) {
                    this.elements.role.focus({
                        preventScroll: true
                    });
                }
            });
        },

        /* ----------------------------------------------------
           APPLICATION FORM
           ---------------------------------------------------- */

        setupApplicationForm: function () {
            const form = this.elements.form;

            if (!form) {
                return;
            }

            form.addEventListener("submit", (event) => {
                event.preventDefault();

                if (!form.reportValidity()) {
                    return;
                }

                const formData = new FormData(form);

                const name = String(
                    formData.get("applicant-name") || ""
                ).trim();

                const email = String(
                    formData.get("applicant-email") || ""
                ).trim();

                const role = String(
                    formData.get("application-role") || ""
                ).trim();

                const phone = String(
                    formData.get("applicant-phone") || ""
                ).trim();

                const message = String(
                    formData.get("applicant-message") || ""
                ).trim();

                if (!name || !email || !role) {
                    this.showMessage(
                        "Please complete your name, email address and preferred role.",
                        "error"
                    );
                    return;
                }

                const validRole = VACANCIES.some(function (job) {
                    return job.published === true &&
                        job.title === role;
                });

                if (!validRole) {
                    this.showMessage(
                        "Please select a currently advertised role.",
                        "error"
                    );
                    return;
                }

                const subject =
                    "Job Application: " + role;

                const body = [
                    CONFIG.company.toUpperCase(),
                    "Job Application",
                    "",
                    "Applicant name: " + name,
                    "Email address: " + email,
                    "Telephone: " + (phone || "Not provided"),
                    "Position: " + role,
                    "",
                    "Cover message:",
                    message || "No cover message provided."
                ].join("\n");

                const mailto =
                    "mailto:" + CONFIG.email +
                    "?subject=" + encodeURIComponent(subject) +
                    "&body=" + encodeURIComponent(body);

                this.showMessage(
                    CONFIG.successMessage,
                    "success"
                );

                /*
                 * The mailto link opens an email draft.
                 * It does not confirm that an application
                 * has been sent or received.
                 */

                window.location.href = mailto;
            });
        },

        /* ----------------------------------------------------
           FORM STATUS MESSAGE
           ---------------------------------------------------- */

        showMessage: function (message, type) {
            const element = this.elements.message;

            if (!element) {
                if (type === "error") {
                    console.error("AVERRA Jobs:", message);
                } else {
                    console.info("AVERRA Jobs:", message);
                }

                return;
            }

            element.textContent = message;
            element.className =
                "application-message " + type;

            element.hidden = false;
            element.setAttribute("role", "status");
            element.setAttribute("aria-live", "polite");
        }
    };

    /* --------------------------------------------------------
       PUBLIC API

       Available in the browser console as AVERRAJobs.
       -------------------------------------------------------- */

    window.AVERRAJobs = Object.freeze({
        version: "2.0",
        company: CONFIG.company,
        email: CONFIG.email,

        getVacancies: function () {
            return VACANCIES.map(function (job) {
                return {
                    ...job,
                    skills: job.skills.slice()
                };
            });
        },

        getPublishedVacancies: function () {
            return VACANCIES
                .filter(function (job) {
                    return job.published === true;
                })
                .map(function (job) {
                    return {
                        ...job,
                        skills: job.skills.slice()
                    };
                });
        },

        getVacancy: function (id) {
            const job = VACANCIES.find(function (item) {
                return item.id === id;
            });

            if (!job) {
                return null;
            }

            return {
                ...job,
                skills: job.skills.slice()
            };
        },

        refresh: function () {
            JobsApp.renderVacancies();
        },

        filter: function () {
            JobsApp.filterVacancies();
        }
    });

    /* --------------------------------------------------------
       START APPLICATION
       -------------------------------------------------------- */

    JobsApp.init();

})();
