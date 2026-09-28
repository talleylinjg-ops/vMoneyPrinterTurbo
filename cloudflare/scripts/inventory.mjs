#!/usr/bin/env node
import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { extname, join, relative } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const staticDir = join(root, "static");
const outFile = join(root, "cloudflare", "static-manifest.json");

const TEXT = new Set([".html", ".css", ".js", ".txt", ".xml", ".svg", ".webmanifest", ".json"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function collectRefs(text, ext) {
  const hrefSrc = [...text.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((m) => m[1]);
  const cssUrls =
    ext === ".css"
      ? [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1])
      : [];
  return { hrefSrc, cssUrls };
}

const files = walk(staticDir).sort();
const items = [];
const allHref = [];
const allCssUrl = [];

for (const full of files) {
  const rel = relative(staticDir, full).replaceAll("\\", "/");
  const buf = readFileSync(full);
  const ext = extname(full).toLowerCase();
  const rec = {
    key: rel,
    path: `/${rel === "index.html" ? "" : rel}`.replace(/\/$/, "/") || "/",
    bytes: buf.length,
    sha256: sha256(buf),
    contentType:
      {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".xml": "application/xml; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webmanifest": "application/manifest+json",
      }[ext] || "application/octet-stream",
  };
  if (TEXT.has(ext)) {
    const text = buf.toString("utf8");
    const refs = collectRefs(text, ext);
    rec.hrefSrc = refs.hrefSrc;
    rec.cssUrls = refs.cssUrls;
    allHref.push(...refs.hrefSrc);
    allCssUrl.push(...refs.cssUrls);
  } else {
    rec.hrefSrc = [];
    rec.cssUrls = [];
  }
  items.push(rec);
}

const localStatic = new Set(items.map((i) => `/${i.key}`));
localStatic.add("/");
localStatic.add("/index.html");

const missing = [];
for (const ref of [...allHref, ...allCssUrl]) {
  if (
    !ref ||
    ref.startsWith("#") ||
    ref.startsWith("http") ||
    ref.startsWith("data:") ||
    ref.startsWith("__ORIGIN__") ||
    ref.includes("${") ||
    ref.startsWith("/api/") ||
    ref.startsWith("/docs")
  ) {
    continue;
  }
  const path = ref.split("?")[0].split("#")[0];
  if (!localStatic.has(path) && !items.some((i) => `/${i.key}` === path)) {
    missing.push(ref);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  staticDir: "static",
  total: items.length,
  cssUrlCount: allCssUrl.length,
  missingRefs: missing,
  files: items,
};

writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(`inventory: ${items.length} files, css url()=${allCssUrl.length}, missing=${missing.length}`);
for (const f of items) {
  console.log(`  ${f.key}  ${f.bytes}  ${f.sha256.slice(0, 12)}`);
}
if (missing.length) {
  console.error("missing refs:", missing);
  process.exit(1);
}
