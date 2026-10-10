# MoneyPrinterTurbo

MoneyPrinterTurbo hosted edition is a free online short-video generator. Enter a topic or script; the pipeline matches Pexels / Pixabay clips, synthesizes Edge TTS, burns subtitles, and exports 9:16 / 16:9 / 1:1 MP4.

- URL: https://moneyprinterturbo.chacha.asia/
- English: https://moneyprinterturbo.chacha.asia/en
- Guide: https://moneyprinterturbo.chacha.asia/guide
- Docs: https://moneyprinterturbo.chacha.asia/docs
- Updated: 2026-10-10
- Version: 1.3.7

## Facts

| Item | Value |
| --- | --- |
| Price | 0 |
| LLM | disabled |
| Engine auth | none |
| Portal auth | x-api-key |
| Footage | Pexels, Pixabay |
| Voice | Edge TTS, fallback gTTS |
| Aspects | 9:16, 16:9, 1:1 |
| Script limit | 1500 characters |
| Video limit | about 180 seconds |
| Complete state | complete |
| Failed state | failed |
| Timeline edit | unsupported, POST a new job |
| Output | storage/tasks/{task_id}/final-1.mp4 |

## How to generate

1. Open https://moneyprinterturbo.chacha.asia/ and enter a topic or paste a script.
2. Pick 9:16, 16:9 or 1:1, then an Edge TTS voice.
3. Click generate. Poll until `state=complete`, then preview or download.

## SaaS

POST https://moneyprinterturbo.chacha.asia/api/v1/videos with `video_subject` or `video_script`. Response includes `status_url`, `preview`, `download`, `poll_after_ms`. Poll GET status_url until `state=complete`, then GET the absolute `download` URL. Range and HEAD are supported. Repeat downloads are served from Cloudflare R2.

## Comparison

| Item | Hosted edition | Official Streamlit | Paid AI video |
| --- | --- | --- | --- |
| Price | 0 | Bring your own LLM key | Per clip or per minute |
| LLM | disabled | optional | required |
| Footage | Pexels, Pixabay | Pexels, Pixabay, Coverr | model frames |
| Voice | Edge TTS | Edge / Azure | cloud TTS |
| API | POST /api/v1/videos | local OpenAPI | vendor |
| Timeline edit | unsupported | not this hosted goal | sometimes |

## FAQ

Q: Is it free?
A: Yes. Pexels / Pixabay footage plus Edge TTS. No LLM.

Q: Do I need an API key?
A: Not on the engine. The optional portal uses `x-api-key`.

Q: Can I edit an existing video?
A: No. This is a new-generation pipeline. POST a new job.

Q: Will the MP4 disappear after refresh?
A: No. Files stay on disk. The same `task_id` still previews and downloads.
