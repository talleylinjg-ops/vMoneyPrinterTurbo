const PAGES = {
  "/": {
    title: "MPT API 开放平台 | 免费短视频生成 API",
    description:
      "MPT API 开放平台：注册即得 API Key，用主题一键生成带配音和字幕的短视频。Pexels / Pixabay 免费素材 + Edge TTS，无需大模型，完全免费不限次数。",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    type: "website",
    crumbs: [{ name: "首页", path: "/" }],
  },
  "/pricing": {
    title: "套餐定价 | MPT API 开放平台",
    description: "完全免费不限次数。Pexels / Pixabay 素材，Edge TTS 配音，无需大模型。",
    robots: "index, follow",
    type: "website",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "套餐定价", path: "/pricing" },
    ],
  },
  "/docs": {
    title: "SaaS API 文档 | MPT 短视频生成",
    description: "POST /api/proxy/v1/videos 提交主题，轮询 task_id，完成后预览下载。x-api-key 鉴权。OpenAPI：/openapi.json。",
    robots: "index, follow",
    type: "article",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "SaaS 文档", path: "/docs" },
    ],
  },
  "/login": {
    title: "登录 | MPT API 开放平台",
    description: "登录 MPT API 开放平台，管理 API Key 并生成短视频。",
    robots: "noindex, follow",
    type: "website",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "登录", path: "/login" },
    ],
  },
  "/register": {
    title: "免费注册 | MPT API 开放平台",
    description: "免费注册即可获得 API Key，主题一键生成短视频。",
    robots: "index, follow",
    type: "website",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "免费注册", path: "/register" },
    ],
  },
  "/console": {
    title: "控制台 | MPT API 开放平台",
    description: "在控制台用主题生成视频，管理 API Key，查看用量。",
    robots: "noindex, nofollow",
    type: "website",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "控制台", path: "/console" },
    ],
  },
  "/membership": {
    title: "会员中心 | MPT API 开放平台",
    description: "查看套餐、订单和账号信息。",
    robots: "noindex, nofollow",
    type: "website",
    crumbs: [
      { name: "首页", path: "/" },
      { name: "会员中心", path: "/membership" },
    ],
  },
};

function upsertLink(rel, type, href, title) {
  const sel = `link[rel="${rel}"][href="${href}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  if (type) el.setAttribute("type", type);
  if (title) el.setAttribute("title", title);
}

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

export function applySeo(path) {
  const page = PAGES[path] || PAGES["/"];
  const origin = window.location.origin;
  const url = origin + path;
  document.title = page.title;
  upsertMeta("name", "description", page.description);
  upsertMeta("name", "robots", page.robots);
  upsertMeta("property", "og:title", page.title);
  upsertMeta("property", "og:description", page.description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", origin + "/og.png");
  upsertMeta("property", "og:image:alt", page.title);
  upsertMeta("property", "og:type", page.type || "website");
  upsertMeta("property", "og:locale", "zh_CN");
  upsertMeta("property", "og:site_name", "MPT API 开放平台");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", page.title);
  upsertMeta("name", "twitter:description", page.description);
  upsertMeta("name", "twitter:image", origin + "/og.png");
  upsertMeta("name", "twitter:image:alt", page.title);
  upsertLink("alternate", "text/plain", origin + "/llms.txt", "LLMs.txt");
  upsertLink("alternate", "text/plain", origin + "/llms-full.txt", "LLMs full");
  upsertLink("alternate", "text/markdown", origin + "/llms.md", "LLMs markdown");
  const zh = document.head.querySelector('link[rel="alternate"][hreflang="zh-CN"]') || document.createElement("link");
  zh.setAttribute("rel", "alternate");
  zh.setAttribute("hreflang", "zh-CN");
  zh.setAttribute("href", url);
  if (!zh.parentNode) document.head.appendChild(zh);
  const xd = document.head.querySelector('link[rel="alternate"][hreflang="x-default"]') || document.createElement("link");
  xd.setAttribute("rel", "alternate");
  xd.setAttribute("hreflang", "x-default");
  xd.setAttribute("href", url);
  if (!xd.parentNode) document.head.appendChild(xd);
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);

  upsertJsonLd("ld-app", {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MPT API 开放平台",
    url: origin + "/",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    inLanguage: "zh-CN",
    description: page.description,
    offers: { "@type": "Offer", "price": "0", "priceCurrency": "CNY", "availability": "https://schema.org/InStock" },
    image: origin + "/og.png",
    isAccessibleForFree: true,
    sameAs: [origin + "/llms.txt", origin + "/docs", origin + "/openapi.json"],
  });

  upsertJsonLd("ld-crumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (page.crumbs || []).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: origin + c.path,
    })),
  });

  if (path === "/") {
    upsertJsonLd("ld-faq", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "如何调用短视频生成 API？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "注册后获得 API Key，POST /api/proxy/v1/videos 提交主题，轮询 GET /api/proxy/v1/videos/{task_id}，完成后预览或下载成片。",
          },
        },
        {
          "@type": "Question",
          name: "收费吗？需要大模型吗？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "完全免费不限次数。素材来自 Pexels / Pixabay，配音使用 Edge TTS，不调用大模型。",
          },
        },
        {
          "@type": "Question",
          name: "有哪些限制？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "文案最多 1500 字，成片约 180 秒。这是全新生成流水线，不支持时间轴精修已有视频。",
          },
        },
        {
          "@type": "Question",
          name: "成片会丢失吗？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "成片落盘保存。刷新页面后仍可用 task_id 预览和下载。",
          },
        },
      ],
    });
    upsertJsonLd("ld-howto", {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "调用短视频生成 API",
      step: [
        { "@type": "HowToStep", name: "注册拿 Key", text: "免费注册后获得 x-api-key。" },
        { "@type": "HowToStep", name: "提交任务", text: "POST /api/proxy/v1/videos，传入 video_subject 与 aspect。" },
        { "@type": "HowToStep", name: "轮询下载", text: "GET /api/proxy/v1/videos/{task_id}，state=complete 后预览或下载。" },
      ],
    });
  } else {
    removeJsonLd("ld-faq");
    removeJsonLd("ld-howto");
  }

  if (path === "/docs") {
    upsertJsonLd("ld-article", {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "MPT 短视频生成 SaaS 文档",
      description: page.description,
      url,
      inLanguage: "zh-CN",
    });
    upsertJsonLd("ld-docs-faq", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "引擎直连需要 API Key 吗？",
          acceptedAnswer: { "@type": "Answer", text: "门户 /api/proxy/v1/videos 需要 x-api-key。引擎直连 /api/v1/videos 开放调用。" },
        },
        {
          "@type": "Question",
          name: "完成态是什么？",
          acceptedAnswer: { "@type": "Answer", text: "成功为 complete，失败为 failed。不要用 succeeded 判断。" },
        },
        {
          "@type": "Question",
          name: "能精修已有视频吗？",
          acceptedAnswer: { "@type": "Answer", text: "不能。这是全新生成流水线，没有时间轴精修接口。改内容需重新 POST。" },
        },
      ],
    });
  } else {
    removeJsonLd("ld-article");
    removeJsonLd("ld-docs-faq");
  }
}
