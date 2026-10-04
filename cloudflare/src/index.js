const REWRITE_KEYS = new Set([
  "index.html",
  "docs.html",
  "llms.txt",
  "llms-full.txt",
  "llms.md",
  "ai.txt",
  "humans.txt",
  "security.txt",
  "manifest.webmanifest",
]);

const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  webmanifest: "application/manifest+json",
};

function cacheControl(pathname) {
  if (
    pathname === "/" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".md") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".webmanifest")
  ) {
    return "public, max-age=300, s-maxage=3600";
  }
  if (
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff")
  ) {
    return "public, max-age=86400, immutable";
  }
  return "public, max-age=3600";
}

function contentTypeFor(key) {
  const ext = key.split(".").pop();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

function r2Key(pathname) {
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/docs" || pathname === "/docs/") return "docs.html";
  if (pathname === "/.well-known/security.txt" || pathname === "/security.txt") return "security.txt";
  if (pathname === "/.well-known/llms.txt") return "llms.txt";
  if (pathname === "/.well-known/ai.txt") return "ai.txt";
  return pathname.replace(/^\/+/, "");
}

function rewrite(text, origin) {
  return text
    .replaceAll("__ORIGIN__", origin)
    .replaceAll("https://moneyprinterturbo.talley-linjg.workers.dev", origin)
    .replaceAll("https://moneyprinterturbo.pages.dev", origin);
}

function robotsTxt(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /llms.txt",
    "Allow: /llms-full.txt",
    "Allow: /llms.md",
    "Allow: /ai.txt",
    "Allow: /docs",
    "Allow: /.well-known/llms.txt",
    "Allow: /.well-known/ai.txt",
    "Allow: /.well-known/security.txt",
    "",
    "User-agent: GPTBot",
    "Allow: /",
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
    "User-agent: DuckDuckBot",
    "Allow: /",
    "",
    "User-agent: YandexBot",
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
    "User-agent: LinkedInBot",
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
  ].join("\n");
}

function engineOpenApi(origin) {
  return {
    openapi: "3.0.3",
    info: {
      title: "MoneyPrinterTurbo Static WebUI",
      version: "1.3.7",
      description: "Cloudflare 纯静态站点。文案、关键词、字幕成片和浏览器配音都在前端完成，无回源 API。",
    },
    servers: [{ url: origin }],
    paths: {
      "/": { get: { summary: "官方浅色四栏 WebUI，浏览器内生成" } },
      "/docs": { get: { summary: "静态使用说明" } },
      "/llms.txt": { get: { summary: "GEO 导览" } },
      "/health": { get: { summary: "边缘健康检查" } },
    },
  };
}

function sitemapXml(origin) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    ["/", "1.0", "daily"],
    ["/docs", "0.8", "weekly"],
    ["/llms.txt", "0.8", "weekly"],
    ["/llms-full.txt", "0.7", "weekly"],
    ["/llms.md", "0.6", "weekly"],
    ["/ai.txt", "0.5", "weekly"],
    ["/humans.txt", "0.3", "monthly"],
    ["/.well-known/security.txt", "0.3", "monthly"],
    ["/.well-known/llms.txt", "0.6", "weekly"],
    ["/.well-known/ai.txt", "0.5", "weekly"],
  ];
  const body = urls
    .map(
      ([p, pr, freq]) =>
        `  <url><loc>${origin}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pr}</priority></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function withEdgeHeaders(headers, servedFrom, pathname) {
  headers.set("x-served-from", servedFrom);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("cache-control", cacheControl(pathname));
  headers.set("x-cache", servedFrom === "cf-cache" ? "HIT" : "MISS");
  return headers;
}

function finalize(body, status, headers) {
  return new Response(body, { status, headers });
}

function jsonResponse(data, pathname, servedFrom = "edge-static") {
  const headers = withEdgeHeaders(new Headers(), servedFrom, pathname);
  headers.set("content-type", "application/json; charset=utf-8");
  return finalize(JSON.stringify(data), 200, headers);
}

async function fromR2(env, key, origin) {
  if (!env.STATIC_BUCKET) return null;
  const obj = await env.STATIC_BUCKET.get(key);
  if (!obj) return null;
  const type = obj.httpMetadata?.contentType || contentTypeFor(key);
  if (REWRITE_KEYS.has(key) || type.startsWith("text/") || type.includes("json") || type.includes("xml")) {
    const text = rewrite(await obj.text(), origin);
    return { body: text, contentType: type };
  }
  return { body: obj.body, contentType: type };
}

async function fromAssets(env, request, url, origin) {
  let asset = await env.ASSETS.fetch(request);
  if (asset.status === 404 && !url.pathname.includes(".")) {
    asset = await env.ASSETS.fetch(new Request(new URL("/", url), request));
  }
  if (!asset.ok) return null;
  const type = asset.headers.get("content-type") || contentTypeFor(r2Key(url.pathname));
  const key = r2Key(url.pathname);
  if (REWRITE_KEYS.has(key) || key.endsWith(".html") || key.endsWith(".txt") || key.endsWith(".md") || key.endsWith(".xml") || key.endsWith(".webmanifest")) {
    return { body: rewrite(await asset.text(), origin), contentType: type };
  }
  return { body: asset.body, contentType: type };
}

async function serveStatic(request, env, url) {
  const origin = url.origin;
  const key = r2Key(url.pathname);
  const cache = caches.default;
  const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });

  const hit = await cache.match(cacheKey);
  if (hit) {
    const headers = withEdgeHeaders(new Headers(hit.headers), "cf-cache", url.pathname);
    return finalize(hit.body, hit.status, headers);
  }

  let servedFrom = "";
  let payload = await fromR2(env, key, origin);
  if (payload) servedFrom = "r2-static";

  if (!payload) {
    payload = await fromAssets(env, request, url, origin);
    if (payload) servedFrom = "edge-assets";
  }

  if (!payload) {
    const headers = withEdgeHeaders(new Headers(), "edge-miss", url.pathname);
    headers.set("content-type", "text/plain; charset=utf-8");
    return finalize("not found", 404, headers);
  }

  const headers = withEdgeHeaders(new Headers(), servedFrom, url.pathname);
  headers.set("content-type", payload.contentType);
  const resp = finalize(payload.body, 200, headers);
  try {
    await cache.put(cacheKey, resp.clone());
  } catch {
    /* cache put is best-effort */
  }
  return resp;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;

    if (url.pathname === "/health") {
      return jsonResponse(
        { status: "ok", service: "MoneyPrinterTurbo", version: "1.3.7", mode: "static-edge" },
        url.pathname
      );
    }

    if (url.pathname === "/docs/saas") {
      return jsonResponse(
        {
          title: "静态站点说明",
          origin,
          mode: "browser",
          auth: "none",
          generate: "浏览器内文案、关键词、字幕成片与语音合成",
          persist: "IndexedDB",
          complete_state: "complete",
          failed_state: "failed",
          limits: { max_script_chars: 1500, max_video_seconds: 180, llm: false, origin_api: false },
        },
        url.pathname
      );
    }

    if (url.pathname === "/robots.txt") {
      const headers = withEdgeHeaders(new Headers(), "edge-static", url.pathname);
      headers.set("content-type", "text/plain; charset=utf-8");
      return finalize(robotsTxt(origin), 200, headers);
    }

    if (url.pathname === "/sitemap.xml") {
      const headers = withEdgeHeaders(new Headers(), "edge-static", url.pathname);
      headers.set("content-type", "application/xml; charset=utf-8");
      return finalize(sitemapXml(origin), 200, headers);
    }

    if (url.pathname === "/openapi.json") {
      const headers = withEdgeHeaders(new Headers(), "edge-static", url.pathname);
      headers.set("content-type", "application/json; charset=utf-8");
      return finalize(JSON.stringify(engineOpenApi(origin)), 200, headers);
    }

    if (url.pathname === "/docs" || url.pathname === "/docs/") {
      const docsUrl = new URL("/docs.html", url);
      return serveStatic(new Request(docsUrl, request), env, docsUrl);
    }

    if (url.pathname === "/.well-known/security.txt" || url.pathname === "/security.txt") {
      const secUrl = new URL("/security.txt", url);
      return serveStatic(new Request(secUrl, request), env, secUrl);
    }

    if (url.pathname === "/.well-known/llms.txt") {
      const llmsUrl = new URL("/llms.txt", url);
      return serveStatic(new Request(llmsUrl, request), env, llmsUrl);
    }

    if (url.pathname === "/.well-known/ai.txt") {
      const aiUrl = new URL("/ai.txt", url);
      return serveStatic(new Request(aiUrl, request), env, aiUrl);
    }

    return serveStatic(request, env, url);
  },
};
