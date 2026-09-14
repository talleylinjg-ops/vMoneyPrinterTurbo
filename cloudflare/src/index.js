const PROXY_PREFIXES = ["/api/", "/docs"];
const PROXY_EXACT = ["/health"];

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
    "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, Content-Disposition",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && shouldProxy(url.pathname)) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (shouldProxy(url.pathname)) {
      const origin = (env.BACKEND_ORIGIN || "").replace(/\/+$/, "");
      if (!origin) {
        return Response.json({ error: "BACKEND_ORIGIN is not configured" }, { status: 500 });
      }

      const target = new URL(url.pathname + url.search, origin);
      const headers = new Headers(request.headers);
      headers.set("Host", new URL(origin).host);
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
        return Response.json(
          { error: "backend unreachable", detail: String(err) },
          { status: 502, headers: corsHeaders() }
        );
      }

      const outHeaders = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(corsHeaders())) outHeaders.set(k, v);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
