# MoneyPrinterTurbo 托管版

独立中文短视频生成站点。放弃 LLM，使用 Pexels / Pixabay 免费素材和 Edge TTS。成片落盘，刷新后仍可预览下载。

这是全新生成流水线，不支持时间轴精修已有视频。文案最多 1500 字，成片约 180 秒。

## 两个入口

| 入口 | 用途 | 鉴权 |
|------|------|------|
| 引擎 WebUI | 本页填写主题直接出片 | 无 |
| 门户 api-portal | 注册拿 Key，给外部 SaaS 调用 | `x-api-key` |

引擎默认 `http://0.0.0.0:8501`。门户默认 `http://0.0.0.0:3000`，网关转发到引擎。

## 启动引擎

```bash
pip3 install --break-system-packages -r requirements.txt
python3 -m uvicorn app:app --host 0.0.0.0 --port 8501
```

打开页面，填写主题，点击「生成视频」。成片：`storage/tasks/{task_id}/final-1.mp4`。

## 启动门户

```bash
cd api-portal/web && npm install && npm run build
cd ../server && MPT_API_BASE=http://127.0.0.1:8501 PORT=3000 node index.js
```

注册后在控制台生成，或用 API Key 调用。

## SaaS 调用（门户，推荐）

规格：`GET /openapi.json`  
摘要：`GET /api/saas`  
文档页：`/docs`

```bash
curl -X POST https://YOUR_PORTAL/api/proxy/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: mpt_你的密钥" \
  -d '{"video_subject":"春天适合出发","aspect":"9:16"}'
```

轮询 `GET /api/proxy/v1/videos/{task_id}`，直到 `state=complete`（失败为 `failed`）。

```bash
curl https://YOUR_PORTAL/api/proxy/v1/videos/TASK_ID \
  -H "x-api-key: mpt_你的密钥"

curl -L "https://YOUR_PORTAL/api/proxy/v1/videos/TASK_ID/preview?api_key=mpt_你的密钥" -o preview.mp4
curl -L "https://YOUR_PORTAL/api/proxy/v1/videos/TASK_ID/download?api_key=mpt_你的密钥" -o video.mp4
```

常用字段：`video_subject`、`video_script`、`aspect`=`9:16|16:9|1:1`、`video_source`=`pexels|pixabay|auto`。

## SaaS 调用（引擎直连）

无需 Key。路径是 `/api/v1/videos*`，规格 `GET /openapi.json`，说明 `GET /docs/saas`。

```bash
curl -X POST https://YOUR_ENGINE/api/v1/videos \
  -H "Content-Type: application/json" \
  -d '{"video_subject":"人工智能如何改变日常生活","aspect":"9:16","video_source":"pexels"}'
```

## Cloudflare 边缘

静态 HTML/CSS/JS/图片走 Cache → R2 `moneyprinterturbo-static` → Worker Assets，浏览不碰原站。
只有 `/api/*` `/health` `/docs/saas` 回源做生成和下载。`/docs` 走边缘 `docs.html`。

## SEO / GEO

引擎与门户均提供：

- `/llms.txt` `/llms-full.txt` `/llms.md`：给大模型阅读
- `/ai.txt` `/humans.txt` `/.well-known/security.txt`
- `/.well-known/llms.txt` `/.well-known/ai.txt`
- 动态 `/robots.txt` `/sitemap.xml`（按访问域名改写，含 lastmod）
- JSON-LD：WebApplication / HowTo / FAQ / Breadcrumb
- 首页可见 FAQ 与产品事实，noscript 含文档与 llms.txt 入口

```bash
cd cloudflare
npm run inventory
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=2e33f078edc00ade4b25e61526d6f544 npm run sync-r2
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=xxx npx wrangler deploy
```

Worker：`https://moneyprinterturbo.talley-linjg.workers.dev`
