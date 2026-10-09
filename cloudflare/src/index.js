const PROXY_PREFIXES = ["/api/"];
const PROXY_EXACT = ["/health", "/docs/saas"];
const REWRITE_KEYS = new Set([
  "index.html",
  "docs.html",
  "en.html",
  "guide.html",
  "index.md",
  "en.md",
  "guide.md",
  "docs.md",
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

function shouldProxy(pathname) {
  return PROXY_PREFIXES.some((p) => pathname.startsWith(p)) || PROXY_EXACT.includes(pathname);
}

const VIDEO_FILE_RE = /^\/api\/v1\/videos\/([0-9a-fA-F-]{8,})\/(preview|download|file)$/;

function videoCacheKey(taskId) {
  return `videos/${taskId}/final-1.mp4`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range, Authorization, x-api-key",
    "Access-Control-Expose-Headers":
      "Content-Range, Content-Length, Accept-Ranges, Content-Disposition",
  };
}

function cacheControl(pathname) {
  if (
    pathname === "/" ||
    pathname === "/en" ||
    pathname === "/en/" ||
    pathname === "/guide" ||
    pathname === "/guide/" ||
    pathname === "/docs" ||
    pathname === "/docs/" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".md") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".webmanifest")
  ) {
    return "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
  }
  if (
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff")
  ) {
    return "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
  }
  return "public, max-age=3600, stale-while-revalidate=86400";
}

function contentTypeFor(key) {
  const ext = key.split(".").pop();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

function r2Key(pathname) {
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/docs" || pathname === "/docs/") return "docs.html";
  if (pathname === "/en" || pathname === "/en/") return "en.html";
  if (pathname === "/guide" || pathname === "/guide/") return "guide.html";
  if (pathname === "/.well-known/security.txt" || pathname === "/security.txt") return "security.txt";
  if (pathname === "/.well-known/llms.txt") return "llms.txt";
  if (pathname === "/.well-known/ai.txt") return "ai.txt";
  return pathname.replace(/^\/+/, "");
}

function rewrite(text, origin) {
  return text
    .replaceAll("__ORIGIN__", origin)
    .replaceAll("https://moneyprinterturbo.chacha.asia", origin)
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
    "Allow: /en",
    "Allow: /guide",
    "Allow: /index.md",
    "Allow: /en.md",
    "Allow: /guide.md",
    "Allow: /docs.md",
    "Allow: /openapi.json",
    "Allow: /.well-known/llms.txt",
    "Allow: /.well-known/ai.txt",
    "Allow: /.well-known/security.txt",
    "Disallow: /api/",
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
    "User-agent: Applebot",
    "Allow: /",
    "",
    "User-agent: Perplexity-User",
    "Allow: /",
    "",
    "User-agent: YouBot",
    "Allow: /",
    "",
    "User-agent: cohere-ai",
    "Allow: /",
    "",
    "User-agent: Diffbot",
    "Allow: /",
    "",
    "User-agent: GoogleOther",
    "Allow: /",
    "",
    "User-agent: Meta-ExternalFetcher",
    "Allow: /",
    "",
    "User-agent: Timpibot",
    "Allow: /",
    "",
    "User-agent: MistralAI-User",
    "Allow: /",
    "",
    "User-agent: DuckAssistBot",
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
      title: "MoneyPrinterTurbo Video API",
      version: "1.3.7",
      description: "POST 主题即可异步生成配音字幕成片。不支持时间轴精修。",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/v1/videos": { post: { summary: "提交生成任务，返回 task_id / status_url / poll_after_ms" } },
      "/api/v1/videos/{task_id}": { get: { summary: "按 poll_after_ms 轮询，complete 后用 preview/download 绝对 URL" } },
      "/api/v1/videos/{task_id}/preview": { get: { summary: "预览 MP4，支持 Range，二次下载走 R2" } },
      "/api/v1/videos/{task_id}/download": { get: { summary: "下载 MP4，支持 Range，二次下载走 R2" } },
      "/api/v1/options": { get: { summary: "音色与画幅" } },
      "/api/v1/voices/preview": { get: { summary: "试听配音" } },
      "/api/v1/script": { post: { summary: "本地生成文案" } },
      "/api/v1/terms": { post: { summary: "本地生成关键词" } },
    },
  };
}

function sitemapXml(origin) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const hreflang = (zh, en) =>
    [
      `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${origin}${zh}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${origin}${en}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${zh}" />`,
    ].join("\n");
  const urls = [
    ["/", "1.0", "daily", hreflang("/", "/en")],
    ["/en", "0.9", "weekly", hreflang("/", "/en")],
    ["/guide", "0.85", "weekly", ""],
    ["/docs", "0.8", "weekly", ""],
    ["/index.md", "0.7", "weekly", ""],
    ["/en.md", "0.65", "weekly", ""],
    ["/guide.md", "0.6", "weekly", ""],
    ["/docs.md", "0.6", "weekly", ""],
    ["/llms.txt", "0.8", "weekly", ""],
    ["/llms-full.txt", "0.7", "weekly", ""],
    ["/llms.md", "0.6", "weekly", ""],
    ["/docs/saas", "0.6", "weekly", ""],
    ["/openapi.json", "0.7", "weekly", ""],
    ["/ai.txt", "0.5", "weekly", ""],
    ["/humans.txt", "0.3", "monthly", ""],
    ["/.well-known/security.txt", "0.3", "monthly", ""],
    ["/.well-known/llms.txt", "0.6", "weekly", ""],
    ["/.well-known/ai.txt", "0.5", "weekly", ""],
  ];
  const body = urls
    .map(([p, pr, freq, extra]) => {
      const core = `  <url>\n    <loc>${origin}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pr}</priority>`;
      return extra ? `${core}\n${extra}\n  </url>` : `${core}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

function originDownPage(origin) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>生成服务暂时不可用 | MoneyPrinterTurbo</title>
  <style>
    body { font-family: "Source Sans Pro", "Noto Sans CJK SC", sans-serif; background:#ffffff; color:#262730; display:grid; place-items:center; min-height:100vh; margin:0; }
    main { max-width: 520px; padding: 32px; }
    a { color:#0068c9; }
  </style>
</head>
<body>
  <main>
    <h1>浏览页在边缘，生成接口需后端</h1>
    <p>静态前台已由 Cloudflare Cache / R2 / Assets 托管，不依赖源站。视频生成、预览、下载需要后端在线。</p>
    <p><a href="${origin}/">返回首页</a></p>
  </main>
</body>
</html>`;
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

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header || "");
  if (!m) return null;
  let start = m[1] === "" ? NaN : Number(m[1]);
  let end = m[2] === "" ? NaN : Number(m[2]);
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  if (Number.isNaN(start)) {
    const suffix = end;
    if (suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start >= size || start > end) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

function videoHeaders(kind, extra = {}) {
  const headers = new Headers(corsHeaders());
  headers.set("Content-Type", "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  if (kind === "download") {
    headers.set("Content-Disposition", extra.disposition || 'attachment; filename="video.mp4"');
  } else {
    headers.set("Content-Disposition", extra.disposition || "inline");
  }
  if (extra.etag) headers.set("ETag", extra.etag);
  if (extra.servedFrom) headers.set("x-served-from", extra.servedFrom);
  return headers;
}

async function serveVideoFromR2(env, request, taskId, kind) {
  if (!env.STATIC_BUCKET) return null;
  const key = videoCacheKey(taskId);
  const head = await env.STATIC_BUCKET.head(key);
  if (!head || !head.size) return null;
  const size = head.size;
  const etag = head.httpEtag || head.etag;
  const rangeHeader = request.headers.get("Range") || request.headers.get("range");
  if (request.method === "HEAD" && !rangeHeader) {
    const headers = videoHeaders(kind, { etag, servedFrom: "r2-video" });
    headers.set("Content-Length", String(size));
    return new Response(null, { status: 200, headers });
  }
  const range = parseRange(rangeHeader, size);
  if (rangeHeader && !range) {
    const headers = videoHeaders(kind, { etag, servedFrom: "r2-video" });
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    const obj = await env.STATIC_BUCKET.get(key, { range: { offset: range.start, length: range.end - range.start + 1 } });
    if (!obj) return null;
    const headers = videoHeaders(kind, { etag, servedFrom: "r2-video" });
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(obj.body, { status: 206, headers });
  }
  const obj = await env.STATIC_BUCKET.get(key);
  if (!obj) return null;
  const headers = videoHeaders(kind, { etag, servedFrom: "r2-video" });
  headers.set("Content-Length", String(size));
  return new Response(request.method === "HEAD" ? null : obj.body, { status: 200, headers });
}

async function cacheVideoToR2(env, taskId, body, contentType) {
  if (!env.STATIC_BUCKET || !body) return;
  const key = videoCacheKey(taskId);
  try {
    await env.STATIC_BUCKET.put(key, body, {
      httpMetadata: { contentType: contentType || "video/mp4" },
    });
  } catch {
    /* best-effort */
  }
}

async function proxyOrigin(request, env, url, ctx) {
  const origin = (env.BACKEND_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) {
    return Response.json({ error: "BACKEND_ORIGIN is not configured" }, { status: 500 });
  }

  const videoMatch = VIDEO_FILE_RE.exec(url.pathname);
  if (videoMatch && (request.method === "GET" || request.method === "HEAD")) {
    const cached = await serveVideoFromR2(env, request, videoMatch[1], videoMatch[2]);
    if (cached) return cached;
  }

  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers(request.headers);
  headers.set("Host", new URL(origin).host);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
  headers.delete("cf-connecting-ip");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), init);
  } catch (err) {
    const out = new Headers(corsHeaders());
    out.set("x-served-from", "origin-down");
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "backend unreachable", detail: String(err) },
        { status: 502, headers: out }
      );
    }
    out.set("content-type", "text/html; charset=utf-8");
    return new Response(originDownPage(url.origin), { status: 503, headers: out });
  }

  const outHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders())) outHeaders.set(k, v);
  outHeaders.set("x-served-from", "origin-api");

  const isFullMp4 =
    videoMatch &&
    upstream.ok &&
    (upstream.headers.get("content-type") || "").includes("mp4") &&
    request.method === "GET" &&
    !request.headers.get("Range") &&
    !request.headers.get("range");

  if (isFullMp4 && upstream.body) {
    const [clientBody, r2Body] = upstream.body.tee();
    const put = cacheVideoToR2(env, videoMatch[1], r2Body, "video/mp4");
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(put);
    return new Response(clientBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;

    if (request.method === "OPTIONS" && shouldProxy(url.pathname)) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (shouldProxy(url.pathname)) {
      return proxyOrigin(request, env, url, ctx);
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

    if (url.pathname === "/en" || url.pathname === "/en/") {
      const enUrl = new URL("/en.html", url);
      return serveStatic(new Request(enUrl, request), env, enUrl);
    }

    if (url.pathname === "/guide" || url.pathname === "/guide/") {
      const guideUrl = new URL("/guide.html", url);
      return serveStatic(new Request(guideUrl, request), env, guideUrl);
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
