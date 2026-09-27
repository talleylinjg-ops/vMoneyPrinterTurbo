import asyncio
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from urllib.parse import quote

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pipeline import (
    ASPECTS,
    MAX_CHARS,
    MAX_SECONDS,
    TASKS,
    VOICES,
    generate_video,
    list_tasks,
    load_task,
    save_task,
)

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
STATIC.mkdir(exist_ok=True)

running: dict[str, asyncio.Task] = {}

app = FastAPI(title="MoneyPrinterTurbo", version="1.3.7")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
                f"Sitemap: {origin}/sitemap.xml",
                f"Host: {origin}",
                "",
                "# AI / GEO",
                f"# llms.txt: {origin}/llms.txt",
                f"# ai.txt: {origin}/ai.txt",
                "",
            ]
        )
    )


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap(request: Request):
    origin = public_origin(request)
    urls = [
        ("/", "1.0"),
        ("/llms.txt", "0.8"),
        ("/docs/saas", "0.7"),
    ]
    items = "\n".join(
        f"  <url><loc>{origin}{path}</loc><changefreq>daily</changefreq><priority>{prio}</priority></url>"
        for path, prio in urls
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
    return PlainTextResponse(text)


@app.get("/ai.txt", include_in_schema=False)
async def ai_txt(request: Request):
    origin = public_origin(request)
    text = rewrite_origin((STATIC / "ai.txt").read_text(encoding="utf-8"), origin)
    return PlainTextResponse(text)


@app.get("/", include_in_schema=False)
async def home(request: Request):
    origin = public_origin(request)
    html = rewrite_origin((STATIC / "index.html").read_text(encoding="utf-8"), origin)
    return HTMLResponse(html)


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


@app.get("/docs/saas")
async def saas_help():
    return {
        "title": "SaaS 调用说明",
        "base": "/api/v1",
        "auth": "当前免费开放，无需 API Key",
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
        "preview": "GET /api/v1/videos/{task_id}/preview  成片持久保存在服务器，刷新页面不会丢失",
        "download": "GET /api/v1/videos/{task_id}/download",
        "limits": {
            "max_script_chars": MAX_CHARS,
            "max_video_seconds": MAX_SECONDS,
            "llm": False,
            "cost": "完全免费：Pexels/Pixabay 素材 + Edge TTS 配音",
        },
    }


app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8501, reload=False)
