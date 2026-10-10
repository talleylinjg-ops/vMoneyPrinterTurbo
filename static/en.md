# MoneyPrinterTurbo English

Free short-video generator. Topic in, voiced subtitled MP4 out. No LLM. No engine API key.

- Canonical: https://moneyprinterturbo.chacha.asia/en
- Chinese home: https://moneyprinterturbo.chacha.asia/
- Guide: https://moneyprinterturbo.chacha.asia/guide
- API docs: https://moneyprinterturbo.chacha.asia/docs
- Updated: 2026-10-10
- Version: 1.3.7

## Product facts

Price 0. Script <= 1500 characters. Video about 180 seconds. Aspects 9:16 / 16:9 / 1:1. Footage Pexels and Pixabay. Voice Edge TTS, fallback gTTS. Complete state `complete`. Failed state `failed`. New generation only.

## How to generate

1. Open the Chinese home page and enter a topic or paste a script.
2. Pick aspect ratio and an Edge TTS voice.
3. Click generate. Poll until `state=complete`, then download MP4.

## API

```
POST https://moneyprinterturbo.chacha.asia/api/v1/videos
Content-Type: application/json

{"video_subject":"How AI changes daily life","aspect":"9:16"}
```

Poll `GET /api/v1/videos/{task_id}` using `poll_after_ms`. When `state=complete`, GET the absolute `download` URL. Range and HEAD are supported.

## FAQ

Is it free? Yes.
Do I need an API key on the engine? No.
Can I timeline-edit an existing video? No. POST a new job.
