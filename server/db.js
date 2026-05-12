const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "portfolio.db");
const seedPath = path.join(dataDir, "site.json");
const schemaPath = path.join(process.cwd(), "server", "db-schema.sql");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(schemaPath, "utf8"));

function parseJsonList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function readSeed() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file missing: ${seedPath}`);
  }

  return JSON.parse(fs.readFileSync(seedPath, "utf8"));
}

function ensureSeeded() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM profile").get().count;
  if (count > 0) {
    return;
  }

  const seed = readSeed();
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO profile (
        id, fullName, brand, title, heroHeadline, heroSubtext, aboutSummary, aboutDetails,
        availability, location, email, resumeUrl
      ) VALUES (1, @fullName, @brand, @title, @heroHeadline, @heroSubtext, @aboutSummary,
        @aboutDetails, @availability, @location, @email, @resumeUrl)
    `).run({
      ...seed.profile,
      aboutDetails: JSON.stringify(seed.profile.aboutDetails || []),
    });

    const statInsert = db.prepare("INSERT INTO stats (id, label, value, sortOrder) VALUES (@id, @label, @value, @sortOrder)");
    (seed.stats || []).forEach((item, index) => statInsert.run({ ...item, sortOrder: index }));

    const skillInsert = db.prepare("INSERT INTO skills (id, icon, title, description, tags, sortOrder) VALUES (@id, @icon, @title, @description, @tags, @sortOrder)");
    (seed.skills || []).forEach((item, index) => skillInsert.run({
      ...item,
      tags: JSON.stringify(item.tags || []),
      sortOrder: index,
    }));

    const projectInsert = db.prepare("INSERT INTO projects (id, title, category, summary, imageUrl, content, metrics, stack, links, featured, sortOrder) VALUES (@id, @title, @category, @summary, @imageUrl, @content, @metrics, @stack, @links, @featured, @sortOrder)");
    (seed.projects || []).forEach((item, index) => projectInsert.run({
      ...item,
      imageUrl: item.imageUrl || "",
      content: item.content || "",
      metrics: JSON.stringify(item.metrics || []),
      stack: JSON.stringify(item.stack || []),
      links: JSON.stringify(item.links || []),
      featured: item.featured ? 1 : 0,
      sortOrder: index,
    }));

    const linkInsert = db.prepare("INSERT INTO links (id, kind, label, url, placement, sortOrder) VALUES (@id, @kind, @label, @url, @placement, @sortOrder)");
    (seed.socialLinks || []).forEach((item, index) => linkInsert.run({
      ...item,
      kind: "socialLinks",
      placement: item.placement || "about",
      sortOrder: index,
    }));
    (seed.contactLinks || []).forEach((item, index) => linkInsert.run({
      ...item,
      kind: "contactLinks",
      placement: item.placement || "contact",
      sortOrder: index,
    }));
  });

  transaction();
}

ensureSeeded();

function getProfile() {
  const row = db.prepare("SELECT * FROM profile WHERE id = 1").get();
  return {
    ...row,
    aboutDetails: parseJsonList(row.aboutDetails),
  };
}

function getStats() {
  return db.prepare("SELECT id, label, value FROM stats ORDER BY sortOrder ASC").all();
}

function getSkills() {
  return db.prepare("SELECT * FROM skills ORDER BY sortOrder ASC").all().map((row) => ({
    ...row,
    tags: parseJsonList(row.tags),
  }));
}

function getProjects() {
  return db.prepare("SELECT * FROM projects ORDER BY sortOrder ASC").all().map((row) => ({
    ...row,
    featured: Boolean(row.featured),
    metrics: parseJsonList(row.metrics),
    stack: parseJsonList(row.stack),
    links: parseJsonList(row.links),
  }));
}

function getLinks(kind) {
  return db.prepare("SELECT id, label, url, placement FROM links WHERE kind = ? ORDER BY sortOrder ASC").all(kind);
}

function getPublicSite() {
  return {
    profile: getProfile(),
    stats: getStats(),
    skills: getSkills(),
    projects: getProjects(),
    socialLinks: getLinks("socialLinks"),
    contactLinks: getLinks("contactLinks"),
  };
}

function updateProfile(profile) {
  db.prepare(`
    UPDATE profile
    SET fullName = @fullName,
        brand = @brand,
        title = @title,
        heroHeadline = @heroHeadline,
        heroSubtext = @heroSubtext,
        aboutSummary = @aboutSummary,
        aboutDetails = @aboutDetails,
        availability = @availability,
        location = @location,
        email = @email,
        resumeUrl = @resumeUrl
    WHERE id = 1
  `).run({
    ...profile,
    aboutDetails: JSON.stringify(profile.aboutDetails || []),
  });

  return getProfile();
}

function replaceStats(items) {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM stats").run();
    const insert = db.prepare("INSERT INTO stats (id, label, value, sortOrder) VALUES (@id, @label, @value, @sortOrder)");
    items.forEach((item, index) => insert.run({ ...item, sortOrder: index }));
  });

  transaction();
  return getStats();
}

function getCollection(kind) {
  if (kind === "skills") return getSkills();
  if (kind === "projects") return getProjects();
  if (kind === "socialLinks") return getLinks("socialLinks");
  if (kind === "contactLinks") return getLinks("contactLinks");
  return [];
}

function getItem(kind, id) {
  return getCollection(kind).find((item) => item.id === id) || null;
}

function createCollectionItem(kind, item) {
  if (kind === "skills") {
    const sortOrder = getSkills().length;
    db.prepare("INSERT INTO skills (id, icon, title, description, tags, sortOrder) VALUES (@id, @icon, @title, @description, @tags, @sortOrder)").run({
      ...item,
      tags: JSON.stringify(item.tags || []),
      sortOrder,
    });
    return getItem("skills", item.id);
  }

  if (kind === "projects") {
    const sortOrder = getProjects().length;
    db.prepare("INSERT INTO projects (id, title, category, summary, imageUrl, content, metrics, stack, links, featured, sortOrder) VALUES (@id, @title, @category, @summary, @imageUrl, @content, @metrics, @stack, @links, @featured, @sortOrder)").run({
      ...item,
      imageUrl: item.imageUrl || "",
      content: item.content || "",
      metrics: JSON.stringify(item.metrics || []),
      stack: JSON.stringify(item.stack || []),
      links: JSON.stringify(item.links || []),
      featured: item.featured ? 1 : 0,
      sortOrder,
    });
    return getItem("projects", item.id);
  }

  const sortOrder = getLinks(kind).length;
  db.prepare("INSERT INTO links (id, kind, label, url, placement, sortOrder) VALUES (@id, @kind, @label, @url, @placement, @sortOrder)").run({
    ...item,
    kind,
    sortOrder,
  });
  return getItem(kind, item.id);
}

function updateCollectionItem(kind, id, item) {
  const current = getItem(kind, id);
  if (!current) {
    return null;
  }

  if (kind === "skills") {
    db.prepare("UPDATE skills SET icon = @icon, title = @title, description = @description, tags = @tags WHERE id = @id").run({
      id,
      ...item,
      tags: JSON.stringify(item.tags || []),
    });
    return getItem(kind, id);
  }

  if (kind === "projects") {
    db.prepare("UPDATE projects SET title = @title, category = @category, summary = @summary, imageUrl = @imageUrl, content = @content, metrics = @metrics, stack = @stack, links = @links, featured = @featured WHERE id = @id").run({
      id,
      ...item,
      imageUrl: item.imageUrl || "",
      content: item.content || "",
      metrics: JSON.stringify(item.metrics || []),
      stack: JSON.stringify(item.stack || []),
      links: JSON.stringify(item.links || []),
      featured: item.featured ? 1 : 0,
    });
    return getItem(kind, id);
  }

  db.prepare("UPDATE links SET label = @label, url = @url, placement = @placement WHERE id = @id AND kind = @kind").run({
    id,
    kind,
    ...item,
  });
  return getItem(kind, id);
}

function deleteCollectionItem(kind, id) {
  if (kind === "skills") {
    return db.prepare("DELETE FROM skills WHERE id = ?").run(id).changes > 0;
  }

  if (kind === "projects") {
    return db.prepare("DELETE FROM projects WHERE id = ?").run(id).changes > 0;
  }

  if (kind === "socialLinks" || kind === "contactLinks") {
    return db.prepare("DELETE FROM links WHERE id = ? AND kind = ?").run(id, kind).changes > 0;
  }

  return false;
}

function makeId(prefix = "item") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

module.exports = {
  getPublicSite,
  getProfile,
  getStats,
  getSkills,
  getProjects,
  getLinks,
  updateProfile,
  replaceStats,
  getCollection,
  getItem,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  makeId,
};
