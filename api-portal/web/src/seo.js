const PAGES = {
  "/": {
    title: "MPT API 开放平台 | 免费短视频生成 API",
    description:
      "MPT API 开放平台：注册即得 API Key，用主题一键生成带配音和字幕的短视频。Pexels / Pixabay 免费素材 + Edge TTS，无需大模型，完全免费不限次数。",
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
  },
  "/pricing": {
    title: "套餐定价 | MPT API 开放平台",
    description: "完全免费不限次数。Pexels / Pixabay 素材，Edge TTS 配音，无需大模型。",
    robots: "index, follow",
  },
  "/docs": {
    title: "API 文档 | MPT API 开放平台",
    description: "提交视频生成任务、查询进度、预览和下载成片。使用 x-api-key 鉴权。",
    robots: "index, follow",
  },
  "/login": {
    title: "登录 | MPT API 开放平台",
    description: "登录 MPT API 开放平台，管理 API Key 并生成短视频。",
    robots: "noindex, follow",
  },
  "/register": {
    title: "免费注册 | MPT API 开放平台",
    description: "免费注册即可获得 API Key，主题一键生成短视频。",
    robots: "index, follow",
  },
  "/console": {
    title: "控制台 | MPT API 开放平台",
    description: "在控制台用主题生成视频，管理 API Key，查看用量。",
    robots: "noindex, nofollow",
  },
  "/membership": {
    title: "会员中心 | MPT API 开放平台",
    description: "查看套餐、订单和账号信息。",
    robots: "noindex, nofollow",
  },
};

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
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:locale", "zh_CN");
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", page.title);
  upsertMeta("name", "twitter:description", page.description);
  upsertMeta("name", "twitter:image", origin + "/og.png");
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
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    inLanguage: "zh-CN",
    description: page.description,
    offers: { "@type": "Offer", "price": "0", "priceCurrency": "CNY" },
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
      ],
    });
  }
}
