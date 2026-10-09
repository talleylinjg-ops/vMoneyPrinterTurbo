# Cloudflare Worker 部署

边缘托管全部前台静态资源。源站休眠时，浏览页仍可完整渲染。只有视频生成、预览、下载回源。

独立部署，不改动 liangdu.asia 的任何配置。

## 流量拓扑

1. HTML / CSS / JS / 图片 / favicon / OG / llms.txt / ai.txt
   - CF Cache HIT → `x-served-from: cf-cache`，`x-cache: HIT`
   - Cache miss → R2 `moneyprinterturbo-static` → `x-served-from: r2-static`
   - R2 miss → Worker Assets → `x-served-from: edge-assets`
   - 静态请求不回源
2. robots.txt / sitemap.xml / openapi.json → Worker 按访问域名现场生成
3. `/api/*` `/health` `/docs/saas` `/openapi.json` → 反代 `BACKEND_ORIGIN`（`x-served-from: origin-api`）。`/docs` `/en` `/guide` 走 Assets `html_handling`（`docs.html` / `en.html` / `guide.html`），不计入 Worker 额度。

源站容器休眠时：首页、样式、脚本、图片、字体全部正常。只有生成/预览/下载暂时不可用。

## 静态清单

前台静态文件（HTML/CSS/JS/图片/GEO）由 inventory 盘点，CSS 内 `url()` 为 0（系统字体，无外链字体/背景图）。 `/docs` → `docs.html`，`/en` → `en.html`，`/guide` → `guide.html`。核心页另有 `/index.md` `/en.md` `/guide.md` `/docs.md`。

```bash
cd cloudflare
npm run inventory
```

会写出 `static-manifest.json`（路径、字节、sha256、引用校验）。缺失引用则退出码 1。

## 同步 R2

```bash
cd cloudflare
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=2e33f078edc00ade4b25e61526d6f544 npm run sync-r2
```

key 使用裸路径：`index.html`、`style.css`、`app.js`、`og.png` 等。

## 部署

```bash
cd cloudflare
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=2e33f078edc00ade4b25e61526d6f544 npx wrangler deploy
```

先 `sync-r2` 再 `deploy`。唯一入口：`https://moneyprinterturbo.chacha.asia`

迁 VPS 后把 `[vars].BACKEND_ORIGIN` 改成 VPS 的 HTTPS 源站，再 `npx wrangler deploy`。浏览仍走本 Worker / R2 / Assets。
