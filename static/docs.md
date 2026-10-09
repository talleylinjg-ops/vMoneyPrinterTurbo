# MoneyPrinterTurbo SaaS 文档

引擎直连无需 API Key。POST 主题即可异步生成配音字幕成片。完成态 `complete`。失败态 `failed`。

- Canonical: https://moneyprinterturbo.chacha.asia/docs
- OpenAPI: https://moneyprinterturbo.chacha.asia/openapi.json
- Home: https://moneyprinterturbo.chacha.asia/
- Updated: 2026-10-09
- Version: 1.3.7

## 提交

POST https://moneyprinterturbo.chacha.asia/api/v1/videos

```json
{"video_subject":"春天适合出发","aspect":"9:16","video_source":"pexels"}
```

返回 `task_id`、`state`、`status_url`、`preview`、`download`、`poll_after_ms`。主题和文案至少填一项。

## 轮询

GET https://moneyprinterturbo.chacha.asia/api/v1/videos/{task_id}

按 `poll_after_ms`（默认 1500）间隔请求。`state=complete` 后用绝对地址 `preview` / `download`。

## 下载

GET https://moneyprinterturbo.chacha.asia/api/v1/videos/{task_id}/download

支持 Range / HEAD。首次回源引擎，二次走 Cloudflare R2。

## 限制

文案 1500 字。成片约 180 秒。关闭 LLM。不支持时间轴精修。门户路径 `/api/proxy/v1/videos` 需要 `x-api-key`。
