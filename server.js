require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const {
  getPublicSite,
  getProfile,
  getCollection,
  getItem,
  updateProfile,
  replaceStats,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  makeId,
} = require("./server/db");
const { validateCredentials, createToken, authRequired } = require("./server/auth");
const { parseList, normalizeProjectPayload } = require("./server/helpers");

const app = express();
const PORT = Number(process.env.PORT || 4000);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image uploads are allowed"));
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/uploads", express.static(uploadsDir));
// Serve static files from the project directory where this file lives.
// Using __dirname makes serving robust if PM2 changes the working directory.
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "portfolio-api", db: "sqlite" });
});

app.get("/api/public/site", (_req, res) => {
  res.json(getPublicSite());
});

app.post("/api/admin/login", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const isValid = await validateCredentials(String(username), String(password));
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken({ username: String(username), role: "admin" });
  return res.json({ token });
});

app.get("/api/admin/site", authRequired, (_req, res) => {
  res.json(getPublicSite());
});

app.put("/api/admin/profile", authRequired, (req, res) => {
  const body = req.body || {};
  const required = ["fullName", "title", "heroHeadline", "heroSubtext", "email"];
  const missing = required.filter((field) => !String(body[field] || "").trim());
  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
  }

  const profile = updateProfile({
    ...getProfile(),
    ...body,
    aboutDetails: Array.isArray(body.aboutDetails) ? body.aboutDetails : parseList(body.aboutDetails),
  });

  return res.json(profile);
});

app.put("/api/admin/stats", authRequired, (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  if (list.length === 0) {
    return res.status(400).json({ message: "Stats array is required" });
  }

  const normalized = list.map((item) => ({
    id: item.id || makeId("stat"),
    label: String(item.label || "Metric").trim(),
    value: String(item.value || "0").trim(),
  }));

  return res.json(replaceStats(normalized));
});

app.post("/api/admin/upload", authRequired, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const relativePath = `/uploads/${req.file.filename}`;
  return res.json({ path: relativePath });
});

const ALLOWED_COLLECTIONS = new Set(["skills", "projects", "socialLinks", "contactLinks"]);

app.get("/api/admin/:collection", authRequired, (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(404).json({ message: "Unknown collection" });
  }

  return res.json(getCollection(collection));
});

app.post("/api/admin/:collection", authRequired, (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(404).json({ message: "Unknown collection" });
  }

  const payload = req.body || {};
  const item = collection === "projects"
    ? normalizeProjectPayload(payload)
    : collection === "skills"
      ? {
          title: String(payload.title || "").trim(),
          icon: String(payload.icon || "Skill").trim(),
          description: String(payload.description || "").trim(),
          tags: parseList(payload.tags),
        }
      : {
          label: String(payload.label || "").trim(),
          url: String(payload.url || "").trim(),
          placement: String(payload.placement || "about").trim(),
        };

  const created = createCollectionItem(collection, { id: makeId(collection === "projects" ? "project" : collection.slice(0, -1)), ...item });
  return res.status(201).json(created);
});

app.put("/api/admin/:collection/:id", authRequired, (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(404).json({ message: "Unknown collection" });
  }

  const current = getItem(collection, id);
  if (!current) {
    return res.status(404).json({ message: "Item not found" });
  }

  const payload = req.body || {};
  const next = collection === "projects"
    ? normalizeProjectPayload({ ...current, ...payload })
    : collection === "skills"
      ? {
          title: String(payload.title || current.title).trim(),
          icon: String(payload.icon || current.icon).trim(),
          description: String(payload.description || current.description).trim(),
          tags: parseList(payload.tags).length ? parseList(payload.tags) : current.tags,
        }
      : {
          label: String(payload.label || current.label).trim(),
          url: String(payload.url || current.url).trim(),
          placement: String(payload.placement || current.placement || "about").trim(),
        };

  return res.json(updateCollectionItem(collection, id, next));
});

app.delete("/api/admin/:collection/:id", authRequired, (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(404).json({ message: "Unknown collection" });
  }

  const removed = deleteCollectionItem(collection, id);
  if (!removed) {
    return res.status(404).json({ message: "Item not found" });
  }

  return res.status(204).send();
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/project", (_req, res) => {
  res.sendFile(path.join(__dirname, "project.html"));
});

app.use((error, _req, res, _next) => {
  const message = error.message || "Internal server error";
  const statusCode = message.includes("Only image uploads") ? 400 : 500;
  res.status(statusCode).json({ message });
});

app.listen(PORT, () => {
  console.log(`Portfolio app is running on http://localhost:${PORT}`);
});