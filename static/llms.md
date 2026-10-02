# MoneyPrinterTurbo

免费短视频生成器。输入主题，匹配 Pexels / Pixabay 素材、Edge TTS 配音、自动字幕，输出 9:16 / 16:9 / 1:1 MP4。不使用大模型。

- 价格：0
- 文案：<= 1500 字
- 成片：<= 180 秒
- 完成态：`complete`
- 精修：不支持

## 链接

- 首页：<__ORIGIN__/>
- 文档：<__ORIGIN__/docs>
- OpenAPI：<__ORIGIN__/openapi.json>
- llms.txt：<__ORIGIN__/llms.txt>
- llms-full.txt：<__ORIGIN__/llms-full.txt>

## API

```http
POST /api/v1/videos
Content-Type: application/json

{"video_subject":"春天适合出发","aspect":"9:16"}
```

轮询 `GET /api/v1/videos/{task_id}` 直到 `state=complete`，再 `/preview` 或 `/download`。
