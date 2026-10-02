import express from "express";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import gateway from "./gateway.js";
import { saasSpec } from "./openapi.js";
import { PORT } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../web/dist");
const publicDir = path.join(__dirname, "../web/public");

app.use("/api/proxy", gateway);

app.get(["/openapi.json", "/api/openapi.json"], (req, res) => {
  res.json(saasSpec(publicOrigin(req)));
});

app.get(["/api/saas", "/docs/saas"], (req, res) => {
  const origin = publicOrigin(req);
  res.json({
    title: "MPT 短视频生成 SaaS",
    origin,
    auth: { header: "x-api-key", query: "api_key" },
    openapi: `${origin}/openapi.json`,
    create: { method: "POST", path: "/api/proxy/v1/videos" },
    poll: { method: "GET", path: "/api/proxy/v1/videos/{task_id}" },
    preview: { method: "GET", path: "/api/proxy/v1/videos/{task_id}/preview" },
    download: { method: "GET", path: "/api/proxy/v1/videos/{task_id}/download" },
    options: { method: "GET", path: "/api/proxy/v1/options" },
    complete_state: "complete",
    failed_state: "failed",
    limits: {
      max_script_chars: 1500,
      max_video_seconds: 180,
      llm: false,
      edit_existing: false,
    },
  });
});

function publicOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`.replace(/\/$/, "");
}

function rewriteOrigin(text, origin) {
  return text.replaceAll("__ORIGIN__", origin);
}

function resolvePublic(name) {
  const fromPublic = path.join(publicDir, name);
  if (existsSync(fromPublic)) return fromPublic;
  const fromDist = path.join(distDir, name);
  if (existsSync(fromDist)) return fromDist;
  return fromPublic;
}

function sendRewritten(req, res, filePath, type) {
  if (!existsSync(filePath)) {
    return res.status(404).type("text/plain").send("not found");
  }
  const origin = publicOrigin(req);
  const text = rewriteOrigin(readFileSync(filePath, "utf8"), origin);
  res.type(type).send(text);
}

app.get("/robots.txt", (req, res) => {
  const origin = publicOrigin(req);
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Allow: /",
      "Allow: /llms.txt",
      "Allow: /llms-full.txt",
      "Allow: /llms.md",
      "Allow: /ai.txt",
      "Allow: /docs",
      "Allow: /pricing",
      "Allow: /register",
      "Allow: /openapi.json",
      "Allow: /.well-known/llms.txt",
      "Allow: /.well-known/ai.txt",
      "Allow: /.well-known/security.txt",
      "Disallow: /api/",
      "Disallow: /console",
      "Disallow: /membership",
      "Disallow: /login",
      "",
      "User-agent: GPTBot",
      "Allow: /",
      "Disallow: /api/",
      "",
      "User-agent: OAI-SearchBot",
      "Allow: /",
      "",
      "User-agent: ChatGPT-User",
      "Allow: /",
      "",
      "User-agent: ClaudeBot",
      "Allow: /",
      "",
      "User-agent: Claude-Web",
      "Allow: /",
      "",
      "User-agent: anthropic-ai",
      "Allow: /",
      "",
      "User-agent: PerplexityBot",
      "Allow: /",
      "",
      "User-agent: Google-Extended",
      "Allow: /",
      "",
      "User-agent: Applebot-Extended",
      "Allow: /",
      "",
      "User-agent: Bytespider",
      "Allow: /",
      "",
      "User-agent: Amazonbot",
      "Allow: /",
      "",
      "User-agent: CCBot",
      "Allow: /",
      "",
      "User-agent: Googlebot",
      "Allow: /",
      "",
      "User-agent: Bingbot",
      "Allow: /",
      "",
      "User-agent: Baiduspider",
      "Allow: /",
      "",
      "User-agent: FacebookBot",
      "Allow: /",
      "",
      "User-agent: meta-externalagent",
      "Allow: /",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      `Host: ${origin}`,
      "",
      `# GEO: ${origin}/llms.txt`,
      `# GEO-full: ${origin}/llms-full.txt`,
      `# GEO-md: ${origin}/llms.md`,
      `# AI: ${origin}/ai.txt`,
      `# Humans: ${origin}/humans.txt`,
      "",
    ].join("\n")
  );
});

app.get("/sitemap.xml", (req, res) => {
  const origin = publicOrigin(req);
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    ["/", "1.0", "daily"],
    ["/pricing", "0.8", "weekly"],
    ["/docs", "0.9", "weekly"],
    ["/register", "0.7", "weekly"],
    ["/openapi.json", "0.8", "weekly"],
    ["/llms.txt", "0.7", "weekly"],
    ["/llms-full.txt", "0.6", "weekly"],
    ["/llms.md", "0.6", "weekly"],
    ["/ai.txt", "0.5", "weekly"],
    ["/api/saas", "0.6", "weekly"],
    ["/humans.txt", "0.3", "monthly"],
    ["/.well-known/security.txt", "0.3", "monthly"],
    ["/.well-known/llms.txt", "0.6", "weekly"],
  ];
  const body = urls
    .map(([p, pr, freq]) => `  <url><loc>${origin}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pr}</priority></url>`)
    .join("\n");
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
});

app.get("/llms.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("llms.txt"), "text/plain");
});

app.get("/llms-full.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("llms-full.txt"), "text/plain");
});

app.get("/ai.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("ai.txt"), "text/plain");
});

app.get("/llms.md", (req, res) => {
  sendRewritten(req, res, resolvePublic("llms.md"), "text/markdown");
});

app.get("/humans.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("humans.txt"), "text/plain");
});

app.get(["/.well-known/security.txt", "/security.txt"], (req, res) => {
  sendRewritten(req, res, resolvePublic("security.txt"), "text/plain");
});

app.get("/.well-known/llms.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("llms.txt"), "text/plain");
});

app.get("/.well-known/ai.txt", (req, res) => {
  sendRewritten(req, res, resolvePublic("ai.txt"), "text/plain");
});

app.get("/", (req, res) => {
  sendRewritten(req, res, path.join(distDir, "index.html"), "text/html");
});

app.use(
  express.static(distDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Served-From", "portal-html");
      } else if (/\.(css|js|png|svg|woff2?)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("X-Served-From", "portal-static");
      }
    },
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  sendRewritten(req, res, path.join(distDir, "index.html"), "text/html");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "服务器内部错误" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Portal server listening on http://0.0.0.0:${PORT}`);
});
