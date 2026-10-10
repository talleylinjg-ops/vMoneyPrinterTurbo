# MoneyPrinterTurbo

免费短视频生成器。输入主题，匹配 Pexels / Pixabay 素材、Edge TTS 配音、自动字幕，输出 9:16 / 16:9 / 1:1 MP4。不使用大模型。引擎直连无需 API Key。

- 价格：0
- 文案：<= 1500 字
- 成片：<= 180 秒
- 完成态：`complete`
- 精修：不支持
- 更新：2026-10-10

## 链接

- 首页：<https://moneyprinterturbo.chacha.asia/>
- 首页 Markdown：<https://moneyprinterturbo.chacha.asia/index.md>
- English：<https://moneyprinterturbo.chacha.asia/en>
- English Markdown：<https://moneyprinterturbo.chacha.asia/en.md>
- 指南：<https://moneyprinterturbo.chacha.asia/guide>
- 指南 Markdown：<https://moneyprinterturbo.chacha.asia/guide.md>
- 文档：<https://moneyprinterturbo.chacha.asia/docs>
- 文档 Markdown：<https://moneyprinterturbo.chacha.asia/docs.md>
- OpenAPI：<https://moneyprinterturbo.chacha.asia/openapi.json>
- llms.txt：<https://moneyprinterturbo.chacha.asia/llms.txt>
- llms-full.txt：<https://moneyprinterturbo.chacha.asia/llms-full.txt>
- ai.txt：<https://moneyprinterturbo.chacha.asia/ai.txt>

## API

```http
POST /api/v1/videos
Content-Type: application/json

{"video_subject":"春天适合出发","aspect":"9:16"}
```

轮询 `GET /api/v1/videos/{task_id}`（间隔 `poll_after_ms`）直到 `state=complete`，再用返回的 `download` 绝对地址取片。支持 Range，二次下载走 R2。
