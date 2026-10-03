# MPT API 开放平台

免费短视频生成 API。注册拿 `x-api-key`，POST 主题即可合成配音字幕成片。Pexels / Pixabay + Edge TTS。不使用大模型。

- 价格：0
- 文案：<= 1500 字
- 成片：<= 180 秒
- 完成态：`complete`
- 精修：不支持
- 更新：2026-10-02

## 链接

- 首页：<__ORIGIN__/>
- 文档：<__ORIGIN__/docs>
- OpenAPI：<__ORIGIN__/openapi.json>
- llms.txt：<__ORIGIN__/llms.txt>
- llms-full.txt：<__ORIGIN__/llms-full.txt>
- ai.txt：<__ORIGIN__/ai.txt>

## API

```http
POST /api/proxy/v1/videos
Content-Type: application/json
x-api-key: mpt_你的密钥

{"video_subject":"春天适合出发","aspect":"9:16"}
```

轮询 `GET /api/proxy/v1/videos/{task_id}` 直到 `state=complete`。
