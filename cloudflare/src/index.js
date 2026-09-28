const PROXY_PREFIXES = ["/api/", "/docs"];
const PROXY_EXACT = ["/health"];
const REWRITE_PATHS = new Set(["/", "/index.html", "/llms.txt", "/ai.txt", "/manifest.webmanifest"]);
const TEXT_EXT = [".html", ".txt", ".xml", ".webmanifest", ".js", ".css", ".svg", ".json"];

function shouldProxy(pathname) {
  return (
    PROXY_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PROXY_EXACT.includes(pathname)
  );
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

function edgeHeaders(extra = {}) {
  return {
    "x-served-from": "edge-static",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    ...extra,
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
    <p>静态前台已由 Cloudflare 边缘托管，不依赖源站。视频生成、预览、下载需要后端在线。</p>
    <p><a href="${origin}/">返回首页</a></p>
  </main>
</body>
</html>`;
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

function shouldRewrite(pathname, contentType) {
  if (REWRITE_PATHS.has(pathname)) return true;
  if (TEXT_EXT.some((ext) => pathname.endsWith(ext)) && contentType && /text|json|xml|javascript|svg/.test(contentType)) {
    return pathname.endsWith(".html") || pathname.endsWith(".txt") || pathname.endsWith(".xml") || pathname.endsWith(".webmanifest");
  }
  return false;
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
      return new Response(robotsTxt(origin), {
        headers: edgeHeaders({
          "content-type": "text/plain; charset=utf-8",
          "cache-control": cacheControl(url.pathname),
        }),
      });
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response(sitemapXml(origin), {
        headers: edgeHeaders({
          "content-type": "application/xml; charset=utf-8",
          "cache-control": cacheControl(url.pathname),
        }),
      });
    }

    let asset = await env.ASSETS.fetch(request);
    if (asset.status === 404 && !url.pathname.includes(".")) {
      asset = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    }

    const headers = new Headers(asset.headers);
    for (const [k, v] of Object.entries(edgeHeaders())) headers.set(k, v);
    headers.set("cache-control", cacheControl(url.pathname));

    const contentType = asset.headers.get("content-type") || "";
    if (asset.ok && shouldRewrite(url.pathname, contentType)) {
      const text = rewrite(await asset.text(), origin);
      if (!headers.get("content-type")) {
        headers.set("content-type", contentType || "text/html; charset=utf-8");
      }
      return new Response(text, { status: asset.status, headers });
    }

    return new Response(asset.body, { status: asset.status, headers });
  },
};
