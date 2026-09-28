const PROXY_PREFIXES = ["/api/", "/docs"];
const PROXY_EXACT = ["/health"];
const REWRITE_KEYS = new Set(["index.html", "llms.txt", "ai.txt", "manifest.webmanifest"]);

const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  webmanifest: "application/manifest+json",
};

function shouldProxy(pathname) {
  return PROXY_PREFIXES.some((p) => pathname.startsWith(p)) || PROXY_EXACT.includes(pathname);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range, Authorization, x-api-key",
    "Access-Control-Expose-Headers":
      "Content-Range, Content-Length, Accept-Ranges, Content-Disposition",
  };
}

function cacheControl(pathname) {
  if (
    pathname === "/" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".txt") ||
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
  ].join("\n");
}

function sitemapXml(origin) {
  const urls = [
    ["/", "1.0", "daily"],
    ["/llms.txt", "0.8", "weekly"],
    ["/docs/saas", "0.7", "weekly"],
  ];
  const body = urls
    .map(
      ([p, pr, freq]) =>
        `  <url><loc>${origin}${p}</loc><changefreq>${freq}</changefreq><priority>${pr}</priority></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function originDownPage(origin) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>生成服务暂时不可用 | MoneyPrinterTurbo</title>
  <style>
    body { font-family: sans-serif; background:#0f1419; color:#e8eef5; display:grid; place-items:center; min-height:100vh; margin:0; }
    main { max-width: 520px; padding: 32px; }
    a { color:#3d8bfd; }
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
  headers.set("cache-control", cacheControl(pathname));
  headers.set("x-cache", servedFrom === "cf-cache" ? "HIT" : "MISS");
  return headers;
}

function finalize(body, status, headers) {
  return new Response(body, { status, headers });
}

async function proxyOrigin(request, env, url) {
  const origin = (env.BACKEND_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) {
    return Response.json({ error: "BACKEND_ORIGIN is not configured" }, { status: 500 });
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
  if (REWRITE_KEYS.has(key) || key.endsWith(".html") || key.endsWith(".txt") || key.endsWith(".xml") || key.endsWith(".webmanifest")) {
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

    if (request.method === "OPTIONS" && shouldProxy(url.pathname)) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (shouldProxy(url.pathname)) {
      return proxyOrigin(request, env, url);
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

    return serveStatic(request, env, url);
  },
};
