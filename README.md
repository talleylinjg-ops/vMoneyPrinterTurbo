# MoneyPrinterTurbo

仓库同时保留两套形态：

1. 官方原版：`MoneyPrinterTurbo/`（Streamlit WebUI）以及本地引擎 `app.py`、门户 `api-portal/`。
2. 纯静态边缘站：`static/` + `cloudflare/`。Cloudflare 只部署这一套。

静态站打开首页填写主题，浏览器内生成本地文案、关键词和带字幕的 WebM。不调用大模型，无需 API Key。全新生成流水线，不支持时间轴精修已有视频。文案最多 1500 字，成片约 180 秒。

静态 WebUI 按官方浅色四栏对齐：文案 / 视频 / 音频 / 字幕，顶部品牌、任务管理、设置、语言列表与官方控件一致。成片与试听在浏览器完成。

## Cloudflare 边缘（纯静态）

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
