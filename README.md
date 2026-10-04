# MoneyPrinterTurbo 静态版

独立中文短视频生成站点。Cloudflare 纯静态托管：打开首页填写主题，浏览器内生成本地文案、关键词和带字幕的 WebM。不调用大模型，无需 API Key。

这是全新生成流水线，不支持时间轴精修已有视频。文案最多 1500 字，成片约 180 秒。

## 使用

打开页面，填写主题，点击「生成视频」。成片保存在本机 IndexedDB，同一浏览器刷新后仍可预览下载。

试听使用浏览器 SpeechSynthesis。成片是 Canvas + MediaRecorder 渲染的字幕画面。

## Cloudflare 边缘

静态 HTML/CSS/JS/图片走 Cache → R2 `moneyprinterturbo-static` → Worker Assets。无回源后端。

```bash
cd cloudflare
npm run inventory
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=2e33f078edc00ade4b25e61526d6f544 npm run sync-r2
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=2e33f078edc00ade4b25e61526d6f544 npx wrangler deploy
```

Worker：`https://moneyprinterturbo.talley-linjg.workers.dev`

## SEO / GEO

- `/llms.txt` `/llms-full.txt` `/llms.md`
- `/ai.txt` `/humans.txt` `/.well-known/security.txt`
- `/.well-known/llms.txt` `/.well-known/ai.txt`
- `/robots.txt` `/sitemap.xml`
- JSON-LD：WebApplication / HowTo / FAQ / Breadcrumb
- 首页可见 FAQ 与产品事实

仓库内仍保留引擎 `app.py` 与门户 `api-portal/`，边缘站不依赖它们出片。
