
"use strict";

/* ============================================================
   AVERRA STAFFING SOLUTIONS LTD
   JOBS MANAGEMENT SYSTEM
   File: frontend/images/jobs.js
   Version: 1.0
   ============================================================ */

(function () {
    "use strict";

    const AVERRA_JOBS = {
        company: "AVERRA Staffing Solutions Ltd",
        email: "info@averrastaffing.co.uk",

        vacancies: [
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
        ]
    };

    const JobsApp = {
        elements: {},

        init: function () {
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
            this.renderVacancies();
            this.setupApplicationButtons();
            this.setupApplicationForm();
            this.setFooterYear();
        },

        cacheElements: function () {
            this.elements.search = document.getElementById("job-search");
            this.elements.category = document.getElementById("job-category");
            this.elements.grid = document.getElementById("jobs-grid");
            this.elements.count = document.getElementById("jobs-count");
            this.elements.empty = document.getElementById("no-jobs");
            this.elements.reset = document.getElementById("reset-jobs");
            this.elements.form = document.getElementById("job-application-form");
            this.elements.role = document.getElementById("application-role");
            this.elements.message = document.getElementById("application-message");
            this.elements.applicationSection = document.getElementById("job-application");
            this.elements.menuToggle = document.getElementById("menu-toggle");
            this.elements.navigation = document.getElementById("main-navigation");
            this.elements.year = document.getElementById("current-year");
        },

        setFooterYear: function () {
            if (this.elements.year) {
                this.elements.year.textContent = new Date().getFullYear();
            }
        },

        setupMobileNavigation: function () {
            const toggle = this.elements.menuToggle;
            const navigation = this.elements.navigation;

            if (!toggle || !navigation) return;

            toggle.addEventListener("click", function () {
                const isOpen = navigation.classList.toggle("is-open");

                toggle.setAttribute("aria-expanded", String(isOpen));
            });

            navigation.querySelectorAll("a").forEach(function (link) {
                link.addEventListener("click", function () {
                    navigation.classList.remove("is-open");
                    toggle.setAttribute("aria-expanded", "false");
                });
            });
        },

        setupFilters: function () {
            const search = this.elements.search;
            const category = this.elements.category;
            const reset = this.elements.reset;

            if (search) {
                search.addEventListener("input", () => this.filterVacancies());
            }

            if (category) {
                category.addEventListener("change", () => this.filterVacancies());
            }

            if (reset) {
                reset.addEventListener("click", () => {
                    if (search) search.value = "";
                    if (category) category.value = "all";

                    this.filterVacancies();
                });
            }
        },

        renderVacancies: function () {
            const grid = this.elements.grid;

            if (!grid) {
                console.warn(
                    "AVERRA Jobs: Add an element with id='jobs-grid' to jobs.html."
                );
                return;
            }

            grid.replaceChildren();

            AVERRA_JOBS.vacancies
                .filter(function (job) {
                    return job.published === true;
                })
                .forEach((job) => {
                    grid.appendChild(this.createJobCard(job));
                });

            this.filterVacancies();
        },

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

            const skills = document.createElement("ul");
            skills.className = "job-skills";

            job.skills.forEach(function (skill) {
                const item = document.createElement("li");
                item.textContent = skill;
                skills.appendChild(item);
            });

            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn btn-primary apply-job-button";
            button.dataset.jobTitle = job.title;
            button.textContent = "Apply for this role";

            article.append(
                top,
                title,
                type,
                description,
                skills,
                button
            );

            return article;
        },

        formatCategory: function (category) {
            const labels = {
                finance: "Finance",
                technology: "Technology",
                "customer-service": "Customer Service",
                administration: "Administration",
                marketing: "Sales & Marketing",
                "human-resources": "Human Resources"
            };

            return labels[category] || "Professional";
        },

        filterVacancies: function () {
            const searchValue = this.elements.search
                ? this.elements.search.value.trim().toLowerCase()
                : "";

            const categoryValue = this.elements.category
                ? this.elements.category.value
                : "all";

            const cards = Array.from(
                document.querySelectorAll("#jobs-grid .job-card")
            );

            let visibleCount = 0;

            cards.forEach(function (card) {
                const text = card.textContent.toLowerCase();
                const cardCategory = card.dataset.category || "";

                const matchesSearch = text.includes(searchValue);
                const matchesCategory =
                    categoryValue === "all" ||
                    cardCategory === categoryValue;

                const visible = matchesSearch && matchesCategory;

                card.hidden = !visible;

                if (visible) visibleCount++;
            });

            if (this.elements.count) {
                this.elements.count.textContent =
                    visibleCount + (visibleCount === 1
                        ? " position found"
                        : " positions found");
            }

            if (this.elements.empty) {
                this.elements.empty.hidden = visibleCount !== 0;
            }
        },

        setupApplicationButtons: function () {
            document.addEventListener("click", (event) => {
                const button = event.target.closest(".apply-job-button");

                if (!button) return;

                const role = button.dataset.jobTitle || "";

                if (this.elements.role) {
                    this.elements.role.value = role;
                }

                if (this.elements.applicationSection) {
                    this.elements.applicationSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                } else if (this.elements.form) {
                    this.elements.form.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

                if (this.elements.role) {
                    this.elements.role.focus({ preventScroll: true });
                }
            });
        },

        setupApplicationForm: function () {
            const form = this.elements.form;

            if (!form) return;

            form.addEventListener("submit", (event) => {
                event.preventDefault();

                if (!form.reportValidity()) return;

                const formData = new FormData(form);

                const name = String(formData.get("applicant-name") || "").trim();
                const email = String(formData.get("applicant-email") || "").trim();
                const role = String(formData.get("application-role") || "").trim();
                const phone = String(formData.get("applicant-phone") || "").trim();
                const message = String(formData.get("applicant-message") || "").trim();

                if (!name || !email || !role) {
                    this.showMessage(
                        "Please complete your name, email address and preferred role.",
                        "error"
                    );
                    return;
                }

                const subject = "Job Application: " + role;

                const body = [
                    "AVERRA STAFFING SOLUTIONS LTD",
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
                    "mailto:" + AVERRA_JOBS.email +
                    "?subject=" + encodeURIComponent(subject) +
                    "&body=" + encodeURIComponent(body);

                this.showMessage(
                    "Your email application draft is opening. Please send it from your email application to complete your submission.",
                    "success"
                );

                window.location.href = mailto;
            });
        },

        showMessage: function (message, type) {
            const element = this.elements.message;

            if (!element) return;

            element.textContent = message;
            element.className = "application-message " + type;
            element.hidden = false;
            element.setAttribute("role", "status");
        }
    };

    window.AVERRAJobs = {
        company: AVERRA_JOBS.company,
        vacancies: AVERRA_JOBS.vacancies,
        refresh: function () {
            JobsApp.renderVacancies();
        }
    };

    JobsApp.init();
})();
