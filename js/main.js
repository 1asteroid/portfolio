const state = {
  data: null,
  activeCategory: "all",
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchSiteData() {
  const response = await fetch("/api/public/site");
  if (!response.ok) {
    throw new Error("Failed to load site data");
  }
  return response.json();
}

function renderProfile(data) {
  const { profile, stats, socialLinks, contactLinks } = data;

  document.title = `${profile.fullName} | Portfolio`;
  document.getElementById("brandLogo").textContent = profile.brand || "PF";
  document.getElementById("heroHeadline").textContent = profile.heroHeadline;
  document.getElementById("heroSubtext").textContent = profile.heroSubtext;
  document.getElementById("profileName").textContent = profile.fullName;
  document.getElementById("profileTitle").textContent = profile.title;
  document.getElementById("profileSummary").textContent = profile.aboutSummary;
  document.getElementById("aboutText").textContent = profile.aboutSummary;
  document.getElementById("availabilityText").textContent = profile.availability;
  document.getElementById("locationText").textContent = profile.location;
  document.getElementById("resumeLink").href = profile.resumeUrl || "#";
  document.getElementById("footerName").textContent = profile.fullName;

  const statsList = document.getElementById("statsList");
  statsList.innerHTML = stats
    .map((item) => `<div class="stat-box"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`)
    .join("");

  const aboutDetails = document.getElementById("aboutDetails");
  aboutDetails.innerHTML = (profile.aboutDetails || [])
    .map((line) => `<p class="about-detail-item">${escapeHtml(line)}</p>`)
    .join("");

  const heroSocial = document.getElementById("heroSocial");
  heroSocial.innerHTML = (socialLinks || [])
    .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");

  const contactEl = document.getElementById("contactLinks");
  contactEl.innerHTML = (contactLinks || [])
    .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`)
    .join("");
}

function renderSkills(data) {
  const list = data.skills || [];
  const root = document.getElementById("skillsGrid");
  root.innerHTML = list
    .map((skill) => `
      <article class="skill-card">
        <p class="muted">${escapeHtml(skill.icon)}</p>
        <h3>${escapeHtml(skill.title)}</h3>
        <p class="muted">${escapeHtml(skill.description)}</p>
        <div class="tags">${(skill.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </article>
    `)
    .join("");
}

function renderProjects() {
  const { data, activeCategory } = state;
  const list = (data.projects || []).filter((project) => activeCategory === "all" || project.category === activeCategory);

  const root = document.getElementById("projectsGrid");
  root.innerHTML = list
    .map((project) => {
      const image = project.imageUrl
        ? `<img src="${escapeHtml(project.imageUrl)}" alt="${escapeHtml(project.title)}" loading="lazy" />`
        : "";

      return `
        <article class="project-card ${project.featured ? "featured" : ""}">
          ${image}
          <p class="muted">${escapeHtml(project.category)}</p>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="muted">${escapeHtml(project.summary)}</p>
          <div class="project-metrics">
            ${(project.metrics || []).map((metric) => `<span class="metric">${escapeHtml(metric.label)}: ${escapeHtml(metric.value)}</span>`).join("")}
          </div>
          <div class="stack">
            ${(project.stack || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="project-links">
            <a href="/project?id=${encodeURIComponent(project.id)}" class="btn">Read Case Study →</a>
            ${(project.links || []).map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function bindFilterEvents() {
  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeCategory = button.dataset.category;
      renderProjects();
    });
  });
}

function bindGlobalEffects() {
  const nav = document.getElementById("nav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 15) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  });

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "Message received. Please connect via links below.";
    form.reset();
  });
}

async function init() {
  try {
    state.data = await fetchSiteData();
    renderProfile(state.data);
    renderSkills(state.data);
    renderProjects();
    bindFilterEvents();
    bindGlobalEffects();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif">Backend is not running. Start server with npm run dev.</div>';
  }
}

init();
