import asyncio
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pipeline import (
    ASPECTS,
    CACHE,
    MAX_CHARS,
    MAX_SECONDS,
    TASKS,
    VOICES,
    build_script,
    ensure_dirs,
    generate_video,
    list_tasks,
    load_task,
    save_task,
    synthesize_tts,
)
from keywords import subject_to_terms

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
STATIC.mkdir(exist_ok=True)

running: dict[str, asyncio.Task] = {}

app = FastAPI(
    title="MoneyPrinterTurbo",
    version="1.3.7",
    openapi_url="/internal/openapi.json",
    docs_url=None,
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


class ScriptDraft(BaseModel):
    video_subject: str = ""
    video_script: str = ""
    video_terms: str = ""
    language: str = "zh-CN"


class VideoParams(BaseModel):
    video_subject: str = ""
    video_script: str = ""
    video_terms: str = ""
    language: str = "zh-CN"
    video_source: str = "pexels"
    concat_mode: str = "random"
    transition: str = "none"
    aspect: str = "9:16"
    clip_duration: float = 3
    clip_speed: float = 1.0
    video_count: int = 1
    video_codec: str = "libx264"
    voice_name: str = "zh-CN-XiaoxiaoNeural"
    voice_volume: float = 100
    voice_rate: float = 1.0
    bgm_source: str = "random"
    bgm_volume: float = 20
    subtitle_enabled: bool = True
    font_name: str = "WenQuanYi Micro Hei"
    subtitle_position: str = "bottom"
    text_color: str = "#FFFFFF"
    font_size: int = 60
    stroke_color: str = "#000000"
    stroke_width: float = 1.5
    subtitle_bg: bool = False
    subtitle_bg_color: str = "#000000"
    rounded_subtitle_bg: bool = False


def public_task(task: dict) -> dict:
    return {
        "task_id": task.get("task_id"),
        "state": task.get("state"),
        "progress": task.get("progress", 0),
        "stage": task.get("stage"),
        "error": task.get("error"),
        "script": task.get("script"),
        "terms": task.get("terms"),
        "duration": task.get("duration"),
        "file_size": task.get("file_size"),
        "created_at": task.get("created_at"),
        "updated_at": task.get("updated_at"),
        "params": task.get("params"),
        "preview": task.get("preview"),
        "download": task.get("download"),
        "video": task.get("video"),
    }


async def run_job(task_id: str):
    task = load_task(task_id)
    if not task:
        return
    task["state"] = "processing"
    task["progress"] = 1
    task["stage"] = "start"
    save_task(task)
    try:
        await generate_video(task)
    except Exception as exc:
        task = load_task(task_id) or task
        task["state"] = "failed"
        task["stage"] = "failed"
        task["error"] = str(exc)
        task["updated_at"] = time.time()
        save_task(task)


def public_origin(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.hostname
    if not host:
        return str(request.base_url).rstrip("/")
    return f"{proto}://{host}".rstrip("/")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MoneyPrinterTurbo", "version": "1.3.7"}


@app.get("/robots.txt", include_in_schema=False)
async def robots(request: Request):
    origin = public_origin(request)
    return PlainTextResponse(
        "\n".join(
            [
                "User-agent: *",
                "Allow: /",
                "Allow: /llms.txt",
                "Allow: /llms-full.txt",
                "Allow: /llms.md",
                "Allow: /ai.txt",
                "Allow: /docs",
                "Allow: /openapi.json",
                "Allow: /.well-known/llms.txt",
                "Allow: /.well-known/ai.txt",
                "Allow: /.well-known/security.txt",
                "Disallow: /api/",
                "",
                "User-agent: GPTBot",
                "Allow: /",
                "Disallow: /api/",
                "",
                "User-agent: OAI-SearchBot",
                "Allow: /",
                "",
                "User-agent: ChatGPT-User",
                "Allow: /",
                "",
                "User-agent: ClaudeBot",
                "Allow: /",
                "",
                "User-agent: Claude-Web",
                "Allow: /",
                "",
                "User-agent: anthropic-ai",
                "Allow: /",
                "",
                "User-agent: PerplexityBot",
                "Allow: /",
                "",
                "User-agent: Google-Extended",
                "Allow: /",
                "",
                "User-agent: Applebot-Extended",
                "Allow: /",
                "",
                "User-agent: Bytespider",
                "Allow: /",
                "",
                "User-agent: Amazonbot",
                "Allow: /",
                "",
                "User-agent: CCBot",
                "Allow: /",
                "",
                "User-agent: Googlebot",
                "Allow: /",
                "",
                "User-agent: Bingbot",
                "Allow: /",
                "",
                "User-agent: DuckDuckBot",
                "Allow: /",
                "",
                "User-agent: YandexBot",
                "Allow: /",
                "",
                "User-agent: Baiduspider",
                "Allow: /",
                "",
                "User-agent: FacebookBot",
                "Allow: /",
                "",
                "User-agent: meta-externalagent",
                "Allow: /",
                "",
                "User-agent: LinkedInBot",
                "Allow: /",
                "",
                f"Sitemap: {origin}/sitemap.xml",
                f"Host: {origin}",
                "",
                "# AI / GEO",
                f"# llms.txt: {origin}/llms.txt",
                f"# llms-full.txt: {origin}/llms-full.txt",
                f"# llms.md: {origin}/llms.md",
                f"# ai.txt: {origin}/ai.txt",
                f"# humans.txt: {origin}/humans.txt",
                "",
            ]
        )
    )


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap(request: Request):
    origin = public_origin(request)
    lastmod = time.strftime("%Y-%m-%d", time.gmtime())
    urls = [
        ("/", "1.0", "daily"),
        ("/docs", "0.8", "weekly"),
        ("/llms.txt", "0.8", "weekly"),
        ("/llms-full.txt", "0.7", "weekly"),
        ("/llms.md", "0.6", "weekly"),
        ("/docs/saas", "0.6", "weekly"),
        ("/openapi.json", "0.7", "weekly"),
        ("/ai.txt", "0.5", "weekly"),
        ("/humans.txt", "0.3", "monthly"),
        ("/.well-known/security.txt", "0.3", "monthly"),
        ("/.well-known/llms.txt", "0.6", "weekly"),
        ("/.well-known/ai.txt", "0.5", "weekly"),
    ]
    items = "\n".join(
        f"  <url><loc>{origin}{path}</loc><lastmod>{lastmod}</lastmod><changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        for path, prio, freq in urls
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{items}\n"
        "</urlset>\n"
    )
    return Response(xml, media_type="application/xml")


def rewrite_origin(text: str, origin: str) -> str:
    return (
        text.replace("__ORIGIN__", origin)
        .replace("https://moneyprinterturbo.talley-linjg.workers.dev", origin)
        .replace("https://moneyprinterturbo.pages.dev", origin)
    )


@app.get("/llms.txt", include_in_schema=False)
async def llms_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "llms.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=600"})


@app.get("/llms-full.txt", include_in_schema=False)
async def llms_full_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "llms-full.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=600"})


@app.get("/ai.txt", include_in_schema=False)
async def ai_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "ai.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=600"})


@app.get("/llms.md", include_in_schema=False)
async def llms_md(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "llms.md").read_text(encoding="utf-8"), origin)
    return Response(text, media_type="text/markdown; charset=utf-8", headers={"Cache-Control": "public, max-age=600"})


@app.get("/humans.txt", include_in_schema=False)
async def humans_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "humans.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=600"})


@app.get("/.well-known/security.txt", include_in_schema=False)
@app.get("/security.txt", include_in_schema=False)
async def security_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "security.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=86400"})


@app.get("/.well-known/llms.txt", include_in_schema=False)
async def well_known_llms(request: Request):
    return await llms_txt(request)


@app.get("/.well-known/ai.txt", include_in_schema=False)
async def well_known_ai(request: Request):
    return await ai_txt(request)


@app.get("/", include_in_schema=False)
async def home(request: Request):
    origin = public_origin(request)
    html = rewrite_origin((STATIC / "index.html").read_text(encoding="utf-8"), origin)
    return HTMLResponse(html, headers={"Cache-Control": "public, max-age=300", "X-Served-From": "origin-html"})


@app.get("/docs", include_in_schema=False)
async def docs_html(request: Request):
    origin = public_origin(request)
    html = rewrite_origin((STATIC / "docs.html").read_text(encoding="utf-8"), origin)
    return HTMLResponse(html, headers={"Cache-Control": "public, max-age=300", "X-Served-From": "origin-html"})


@app.get("/api/v1/options")
async def options():
    return {
        "version": "1.3.7",
        "voices": VOICES,
        "aspects": list(ASPECTS.keys()),
        "sources": ["pexels", "pixabay", "auto"],
        "max_script_chars": MAX_CHARS,
        "max_video_seconds": MAX_SECONDS,
        "free": True,
        "llm_enabled": False,
        "note": "放弃 LLM，完全免费运营。填写主题或文案即可生成；素材来自 Pexels / Pixabay，配音使用 Edge TTS。",
    }


@app.post("/api/v1/script")
async def local_script(payload: ScriptDraft):
    subject = (payload.video_subject or "").strip()
    language = (payload.language or "zh-CN") or "zh-CN"
    custom = (payload.video_script or "").strip()
    if not subject and not custom:
        raise HTTPException(400, "请先填写视频主题")
    script = build_script(subject, custom, language)
    terms = subject_to_terms(subject or script, payload.video_terms or "")
    return {"script": script, "terms": ", ".join(terms), "llm": False}


@app.post("/api/v1/terms")
async def local_terms(payload: ScriptDraft):
    script = (payload.video_script or "").strip()
    subject = (payload.video_subject or "").strip()
    if not script and not subject:
        raise HTTPException(400, "请先填写视频文案")
    terms = subject_to_terms(subject or script, payload.video_terms or "")
    return {"terms": ", ".join(terms), "llm": False}


@app.get("/api/v1/voices/preview")
async def voice_preview(voice: str = Query("zh-CN-XiaoxiaoNeural")):
    allowed = {v["id"] for v in VOICES}
    if voice not in allowed:
        raise HTTPException(400, "unknown voice")
    ensure_dirs()
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in voice)
    path = CACHE / f"voice-preview-{safe}.mp3"
    if not path.exists() or path.stat().st_size < 500:
        await synthesize_tts("MoneyPrinterTurbo 免费配音试听。", voice, path)
    return FileResponse(path, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=3600"})


@app.post("/api/v1/videos")
async def create_video(params: VideoParams):
    subject = (params.video_subject or "").strip()
    script = (params.video_script or "").strip()
    if not subject and not script:
        raise HTTPException(400, "请填写视频主题或视频文案")
    if len(script) > MAX_CHARS:
        raise HTTPException(400, f"文案过长（{len(script)} 字），请控制在 {MAX_CHARS} 字以内，约 {MAX_SECONDS} 秒视频")
    task_id = str(uuid.uuid4())
    task = {
        "task_id": task_id,
        "state": "queued",
        "progress": 0,
        "stage": "queued",
        "created_at": time.time(),
        "updated_at": time.time(),
        "params": params.model_dump(),
    }
    save_task(task)
    running[task_id] = asyncio.create_task(run_job(task_id))
    return {"task_id": task_id, "state": "queued"}


@app.get("/api/v1/videos")
async def videos():
    return {"items": [public_task(t) for t in list_tasks()]}


@app.get("/api/v1/videos/{task_id}")
async def video_status(task_id: str):
    task = load_task(task_id)
    if not task:
        raise HTTPException(404, "task not found")
    return public_task(task)


def task_file(task_id: str) -> Path:
    path = TASKS / task_id / "final-1.mp4"
    if not path.exists():
        raise HTTPException(404, "video file not found")
    return path


@app.get("/api/v1/videos/{task_id}/file")
@app.get("/api/v1/videos/{task_id}/preview")
async def preview(task_id: str):
    path = task_file(task_id)
    return FileResponse(path, media_type="video/mp4", filename=f"{task_id}.mp4", headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400"})


@app.get("/api/v1/videos/{task_id}/download")
async def download(task_id: str):
    path = task_file(task_id)
    task = load_task(task_id) or {}
    subject = ((task.get("params") or {}).get("video_subject") or "video").strip()[:60] or "video"
    ascii_name = "".join(ch if ch.isascii() and (ch.isalnum() or ch in "-_") else "_" for ch in subject).strip("_") or "video"
    utf_name = quote(f"{subject}.mp4")
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=f"{ascii_name}.mp4",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_name}.mp4\"; filename*=UTF-8''{utf_name}",
            "Cache-Control": "public, max-age=86400",
            "Accept-Ranges": "bytes",
        },
    )


def engine_openapi(origin: str) -> dict:
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "MoneyPrinterTurbo Video API",
            "version": "1.3.7",
            "description": "免费短视频生成。POST 主题即可异步合成配音字幕成片。不支持时间轴精修。",
        },
        "servers": [{"url": origin}],
        "paths": {
            "/api/v1/videos": {
                "post": {
                    "summary": "提交生成任务",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CreateVideo"},
                                "example": {"video_subject": "春天适合出发", "aspect": "9:16"},
                            }
                        },
                    },
                    "responses": {"200": {"description": "{task_id,state}"}},
                }
            },
            "/api/v1/videos/{task_id}": {"get": {"summary": "查询进度", "responses": {"200": {"description": "Task"}}}},
            "/api/v1/videos/{task_id}/preview": {"get": {"summary": "预览 MP4"}},
            "/api/v1/videos/{task_id}/download": {"get": {"summary": "下载 MP4"}},
            "/api/v1/options": {"get": {"summary": "音色与画幅"}},
            "/api/v1/voices/preview": {"get": {"summary": "试听配音"}},
            "/api/v1/script": {"post": {"summary": "本地生成文案"}},
            "/api/v1/terms": {"post": {"summary": "本地生成关键词"}},
        },
        "components": {
            "schemas": {
                "CreateVideo": {
                    "type": "object",
                    "properties": {
                        "video_subject": {"type": "string"},
                        "video_script": {"type": "string"},
                        "aspect": {"type": "string", "enum": ["9:16", "16:9", "1:1"]},
                        "video_source": {"type": "string", "enum": ["pexels", "pixabay", "auto"]},
                        "voice_name": {"type": "string"},
                        "subtitle_enabled": {"type": "boolean"},
                    },
                }
            }
        },
    }


@app.get("/openapi.json", include_in_schema=False)
async def openapi_json(request: Request):
    return engine_openapi(public_origin(request))


@app.get("/docs/saas")
async def saas_help(request: Request):
    origin = public_origin(request)
    return {
        "title": "SaaS 调用说明",
        "origin": origin,
        "base": "/api/v1",
        "auth": "引擎直连免费开放；门户调用需 x-api-key",
        "openapi": f"{origin}/openapi.json",
        "create": {
            "method": "POST",
            "path": "/api/v1/videos",
            "body": {
                "video_subject": "人工智能如何改变日常生活",
                "video_script": "可选，不填则按主题生成默认文案",
                "video_terms": "可选英文关键词，逗号分隔",
                "language": "zh-CN",
                "video_source": "pexels | pixabay | auto",
                "aspect": "9:16 | 16:9 | 1:1",
                "clip_duration": 3,
                "voice_name": "zh-CN-XiaoxiaoNeural",
                "subtitle_enabled": True,
            },
        },
        "poll": "GET /api/v1/videos/{task_id}",
        "preview": "GET /api/v1/videos/{task_id}/preview",
        "download": "GET /api/v1/videos/{task_id}/download",
        "complete_state": "complete",
        "failed_state": "failed",
        "limits": {
            "max_script_chars": MAX_CHARS,
            "max_video_seconds": MAX_SECONDS,
            "llm": False,
            "edit_existing": False,
            "cost": "完全免费：Pexels/Pixabay 素材 + Edge TTS 配音",
        },
    }


app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8501, reload=False)
