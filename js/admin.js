const tokenKey = "portfolio_admin_token";

const api = {
  get token() {
    return localStorage.getItem(tokenKey) || "";
  },
  set token(value) {
    if (value) {
      localStorage.setItem(tokenKey, value);
    } else {
      localStorage.removeItem(tokenKey);
    }
  },
};

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${api.token}`,
  };
}

async function login(username, password) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const data = await response.json();
  api.token = data.token;
}

async function fetchAdminData() {
  const response = await fetch("/api/admin/site", {
    headers: { Authorization: `Bearer ${api.token}` },
  });
  if (!response.ok) {
    throw new Error("Session invalid");
  }
  return response.json();
}

async function request(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function showDashboard(show) {
  document.getElementById("loginSection").classList.toggle("hidden", show);
  document.getElementById("dashboard").classList.toggle("hidden", !show);
}

function setStatus(id, message, isError = false) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#ff7b7b" : "#53db9d";
}

function fillProfileForm(profile) {
  const form = document.getElementById("profileForm");
  form.fullName.value = profile.fullName || "";
  form.brand.value = profile.brand || "";
  form.title.value = profile.title || "";
  form.heroHeadline.value = profile.heroHeadline || "";
  form.heroSubtext.value = profile.heroSubtext || "";
  form.aboutSummary.value = profile.aboutSummary || "";
  form.aboutDetails.value = (profile.aboutDetails || []).join("\n");
  form.availability.value = profile.availability || "";
  form.location.value = profile.location || "";
  form.email.value = profile.email || "";
  form.resumeUrl.value = profile.resumeUrl || "";
}

function fillStatsForm(stats) {
  const form = document.getElementById("statsForm");
  const list = stats || [];
  form.label1.value = list[0]?.label || "";
  form.value1.value = list[0]?.value || "";
  form.label2.value = list[1]?.label || "";
  form.value2.value = list[1]?.value || "";
  form.label3.value = list[2]?.label || "";
  form.value3.value = list[2]?.value || "";
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tableForSkills(items) {
  const root = document.getElementById("skillsTable");
  root.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Tags</th><th>Description</th><th>Actions</th></tr></thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${esc(item.title)}</td>
            <td>${esc((item.tags || []).join(", "))}</td>
            <td>${esc(item.description)}</td>
            <td class="actions">
              <button class="mini-btn" data-action="edit-skill" data-id="${item.id}">Edit</button>
              <button class="mini-btn danger" data-action="delete-skill" data-id="${item.id}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function tableForProjects(items) {
  const root = document.getElementById("projectsTable");
  root.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Category</th><th>Featured</th><th>Actions</th></tr></thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${esc(item.title)}</td>
            <td>${esc(item.category)}</td>
            <td>${item.featured ? "Yes" : "No"}</td>
            <td class="actions">
              <button class="mini-btn" data-action="edit-project" data-id="${item.id}">Edit</button>
              <button class="mini-btn danger" data-action="delete-project" data-id="${item.id}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function tableForLinks(social, contact) {
  const rows = [
    ...social.map((item) => ({ ...item, kind: "socialLinks" })),
    ...contact.map((item) => ({ ...item, kind: "contactLinks" })),
  ];

  const root = document.getElementById("linksTable");
  root.innerHTML = `
    <table>
      <thead><tr><th>Kind</th><th>Label</th><th>URL</th><th>Actions</th></tr></thead>
      <tbody>
        ${rows.map((item) => `
          <tr>
            <td>${esc(item.kind)}</td>
            <td>${esc(item.label)}</td>
            <td>${esc(item.url)}</td>
            <td class="actions">
              <button class="mini-btn" data-action="edit-link" data-kind="${item.kind}" data-id="${item.id}">Edit</button>
              <button class="mini-btn danger" data-action="delete-link" data-kind="${item.kind}" data-id="${item.id}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

let adminState = null;

async function reloadData() {
  adminState = await fetchAdminData();
  fillProfileForm(adminState.profile);
  fillStatsForm(adminState.stats);
  tableForSkills(adminState.skills || []);
  tableForProjects(adminState.projects || []);
  tableForLinks(adminState.socialLinks || [], adminState.contactLinks || []);
}

function bindLogin() {
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await login(loginForm.username.value, loginForm.password.value);
      showDashboard(true);
      await reloadData();
      setStatus("loginStatus", "Logged in successfully.");
    } catch (_error) {
      setStatus("loginStatus", "Login failed.", true);
    }
  });
}

function bindProfileAndStats() {
  const profileForm = document.getElementById("profileForm");
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      fullName: profileForm.fullName.value,
      brand: profileForm.brand.value,
      title: profileForm.title.value,
      heroHeadline: profileForm.heroHeadline.value,
      heroSubtext: profileForm.heroSubtext.value,
      aboutSummary: profileForm.aboutSummary.value,
      aboutDetails: profileForm.aboutDetails.value.split("\n").map((line) => line.trim()).filter(Boolean),
      availability: profileForm.availability.value,
      location: profileForm.location.value,
      email: profileForm.email.value,
      resumeUrl: profileForm.resumeUrl.value,
    };

    try {
      await request("PUT", "/api/admin/profile", payload);
      setStatus("profileStatus", "Profile updated.");
      await reloadData();
    } catch (error) {
      setStatus("profileStatus", error.message, true);
    }
  });

  const statsForm = document.getElementById("statsForm");
  statsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = [
      { id: adminState.stats?.[0]?.id, label: statsForm.label1.value, value: statsForm.value1.value },
      { id: adminState.stats?.[1]?.id, label: statsForm.label2.value, value: statsForm.value2.value },
      { id: adminState.stats?.[2]?.id, label: statsForm.label3.value, value: statsForm.value3.value },
    ];

    try {
      await request("PUT", "/api/admin/stats", payload);
      setStatus("statsStatus", "Stats updated.");
      await reloadData();
    } catch (error) {
      setStatus("statsStatus", error.message, true);
    }
  });
}

function bindUpload() {
  const uploadForm = document.getElementById("uploadForm");
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = document.getElementById("uploadInput").files[0];
    if (!file) {
      setStatus("uploadStatus", "Select image first.", true);
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${api.token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setStatus("uploadStatus", `Uploaded: ${result.path}`);
      const projectForm = document.getElementById("projectForm");
      const markdown = `\n![Project image](${result.path})\n`;
      const target = projectForm.content;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.setRangeText(markdown, start, end, "end");
      target.focus();
    } catch (error) {
      setStatus("uploadStatus", error.message, true);
    }
  });
}

function bindCrudForms() {
  const skillForm = document.getElementById("skillForm");
  skillForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = skillForm.id.value;
    const payload = {
      icon: skillForm.icon.value,
      title: skillForm.title.value,
      tags: skillForm.tags.value,
      description: skillForm.description.value,
    };

    if (id) {
      await request("PUT", `/api/admin/skills/${id}`, payload);
    } else {
      await request("POST", "/api/admin/skills", payload);
    }

    skillForm.reset();
    await reloadData();
  });

  const projectForm = document.getElementById("projectForm");
  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = projectForm.id.value;
    const payload = {
      title: projectForm.title.value,
      category: projectForm.category.value,
      summary: projectForm.summary.value,
      imageUrl: projectForm.imageUrl.value,
      content: projectForm.content.value,
      stack: projectForm.stack.value,
      metrics: projectForm.metrics.value,
      links: projectForm.links.value,
      featured: projectForm.featured.checked,
    };

    if (id) {
      await request("PUT", `/api/admin/projects/${id}`, payload);
    } else {
      await request("POST", "/api/admin/projects", payload);
    }

    projectForm.reset();
    await reloadData();
  });

  const linkForm = document.getElementById("linkForm");
  linkForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = linkForm.id.value;
    const kind = linkForm.kind.value;
    const payload = {
      label: linkForm.label.value,
      url: linkForm.url.value,
      placement: linkForm.placement.value,
    };

    if (id) {
      await request("PUT", `/api/admin/${kind}/${id}`, payload);
    } else {
      await request("POST", `/api/admin/${kind}`, payload);
    }

    linkForm.reset();
    await reloadData();
  });
}

function bindTableActions() {
  document.body.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "delete-skill") {
      await request("DELETE", `/api/admin/skills/${id}`);
      await reloadData();
      return;
    }

    if (action === "delete-project") {
      await request("DELETE", `/api/admin/projects/${id}`);
      await reloadData();
      return;
    }

    if (action === "delete-link") {
      await request("DELETE", `/api/admin/${button.dataset.kind}/${id}`);
      await reloadData();
      return;
    }

    if (action === "edit-skill") {
      const item = adminState.skills.find((entry) => entry.id === id);
      if (!item) return;
      const form = document.getElementById("skillForm");
      form.id.value = item.id;
      form.icon.value = item.icon;
      form.title.value = item.title;
      form.tags.value = (item.tags || []).join(", ");
      form.description.value = item.description;
      return;
    }

    if (action === "edit-project") {
      const item = adminState.projects.find((entry) => entry.id === id);
      if (!item) return;
      const form = document.getElementById("projectForm");
      form.id.value = item.id;
      form.title.value = item.title;
      form.category.value = item.category;
      form.summary.value = item.summary;
      form.imageUrl.value = item.imageUrl || "";
      form.stack.value = (item.stack || []).join(", ");
      form.metrics.value = (item.metrics || []).map((entry) => `${entry.label}:${entry.value}`).join(",");
      form.links.value = (item.links || []).map((entry) => `${entry.label}|${entry.url}`).join(",");
      form.content.value = item.content || "";
      form.featured.checked = Boolean(item.featured);
      return;
    }

    if (action === "edit-link") {
      const kind = button.dataset.kind;
      const list = kind === "socialLinks" ? adminState.socialLinks : adminState.contactLinks;
      const item = (list || []).find((entry) => entry.id === id);
      if (!item) return;
      const form = document.getElementById("linkForm");
      form.id.value = item.id;
      form.kind.value = kind;
      form.label.value = item.label;
      form.url.value = item.url;
      form.placement.value = item.placement || "about";
    }
  });
}

function bindLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    api.token = "";
    showDashboard(false);
  });
}

async function init() {
  bindLogin();
  bindProfileAndStats();
  bindUpload();
  bindCrudForms();
  bindTableActions();
  bindLogout();

  if (!api.token) {
    showDashboard(false);
    return;
  }

  try {
    await reloadData();
    showDashboard(true);
  } catch (_error) {
    api.token = "";
    showDashboard(false);
  }
}

init();
