function parseList(input) {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeProjectPayload(payload) {
  return {
    title: String(payload.title || "").trim(),
    category: String(payload.category || "analytics").trim().toLowerCase(),
    summary: String(payload.summary || "").trim(),
    imageUrl: String(payload.imageUrl || "").trim(),
    content: String(payload.content || "").trim(),
    featured: Boolean(payload.featured),
    stack: parseList(payload.stack),
    metrics: Array.isArray(payload.metrics) ? payload.metrics : parseList(payload.metrics).map((item) => {
      const [label, value] = item.split(":");
      return {
        label: (label || "Metric").trim(),
        value: (value || "-").trim(),
      };
    }),
    links: Array.isArray(payload.links) ? payload.links : parseList(payload.links).map((item) => {
      const [label, url] = item.split("|");
      return {
        label: (label || "Link").trim(),
        url: (url || "#").trim(),
      };
    }),
  };
}

module.exports = {
  parseList,
  normalizeProjectPayload,
};
