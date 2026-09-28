# Cloudflare Worker 部署

边缘托管全部前台静态资源（HTML / CSS / JS / 图片 / 字体 / robots / sitemap / llms.txt）。
源站休眠时，浏览页仍可完整渲染。只有视频生成、预览、下载回源。

## 流量拓扑

- HTML / CSS / JS / 图片 / OG / favicon / llms.txt / ai.txt → Worker Assets（`x-served-from: edge-static`），不碰原站
- robots.txt / sitemap.xml → Worker 按访问域名现场生成，不碰原站
- `/api/*` `/docs*` `/health` → 反代 `BACKEND_ORIGIN`（`x-served-from: origin-api`）

学习 liangdu.asia 的边缘镜像思路，独立部署，不改动对方配置。

## 配置

编辑 `wrangler.toml` 中的 `BACKEND_ORIGIN`，指向自建 Python 后端：

```toml
[vars]
BACKEND_ORIGIN = "https://your-backend.example.com"
```

## 本地调试

```bash
cd cloudflare
npm install
npx wrangler dev
```

## 部署

```bash
cd cloudflare
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=xxx npx wrangler deploy
```

部署后地址：`https://moneyprinterturbo.<subdomain>.workers.dev`
