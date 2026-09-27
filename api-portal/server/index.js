import express from "express";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import gateway from "./gateway.js";
import { PORT } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../web/dist");

app.use("/api/proxy", gateway);

function publicOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`.replace(/\/$/, "");
}

function rewriteOrigin(text, origin) {
  return text.replaceAll("__ORIGIN__", origin);
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
      "Disallow: /api/",
      "Disallow: /console",
      "Disallow: /membership",
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
      `Sitemap: ${origin}/sitemap.xml`,
      `Host: ${origin}`,
      "",
      `# GEO: ${origin}/llms.txt`,
      `# AI: ${origin}/ai.txt`,
      "",
    ].join("\n")
  );
});

app.get("/sitemap.xml", (req, res) => {
  const origin = publicOrigin(req);
  const urls = [
    ["/", "1.0"],
    ["/pricing", "0.8"],
    ["/docs", "0.9"],
    ["/register", "0.7"],
    ["/llms.txt", "0.6"],
  ];
  const body = urls
    .map(([p, pr]) => `  <url><loc>${origin}${p}</loc><changefreq>daily</changefreq><priority>${pr}</priority></url>`)
    .join("\n");
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
});

app.get("/llms.txt", (req, res) => {
  sendRewritten(req, res, path.join(distDir, "llms.txt"), "text/plain");
});

app.get("/ai.txt", (req, res) => {
  sendRewritten(req, res, path.join(distDir, "ai.txt"), "text/plain");
});

app.get("/", (req, res) => {
  sendRewritten(req, res, path.join(distDir, "index.html"), "text/html");
});

app.use(
  express.static(distDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
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
