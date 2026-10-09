# MoneyPrinterTurbo 使用指南

三步把主题变成带配音和字幕的 MP4。免费，无需大模型。

- Canonical: https://moneyprinterturbo.chacha.asia/guide
- Home: https://moneyprinterturbo.chacha.asia/
- English: https://moneyprinterturbo.chacha.asia/en
- Docs: https://moneyprinterturbo.chacha.asia/docs
- Updated: 2026-10-09
- Version: 1.3.7

## 步骤

1. 填写主题或文案。例如「春天适合出发」。也可粘贴旁白，最多 1500 字。
2. 选择画幅与配音。抖音 / Shorts 用 9:16，横屏用 16:9，头像或封面用 1:1。默认 zh-CN-XiaoxiaoNeural。
3. 生成并下载。进度到 100% 且 `state=complete` 后预览或下载。刷新后同一 `task_id` 仍有效。

## 素材

画面来自 Pexels / Pixabay。配音 Edge TTS，失败回退 gTTS。不调用大模型。价格 0。

## 限制

文案 1500 字。成片约 180 秒。全新生成，没有时间轴精修。引擎直连免 Key。门户需要 `x-api-key`。

## SaaS

POST `/api/v1/videos`，按 `poll_after_ms` 轮询，`complete` 后 GET 返回的 `download` 绝对地址。
