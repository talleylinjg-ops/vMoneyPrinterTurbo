import asyncio
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MoneyPrinterTurbo", "version": "1.3.7"}


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
    subject = (task.get("params") or {}).get("video_subject") or "video"
    safe = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in subject)[:60].strip() or "video"
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=f"{safe}.mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{safe}.mp4"',
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
