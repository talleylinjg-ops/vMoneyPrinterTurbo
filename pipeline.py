import asyncio
import json
import math
import os
import random
import re
import shutil
import subprocess
import time
import tomllib
from pathlib import Path
from typing import Callable, Optional

import httpx

from keywords import subject_to_terms

ROOT = Path(__file__).resolve().parent
STORAGE = ROOT / "storage"
TASKS = STORAGE / "tasks"
CACHE = STORAGE / "cache"


def _load_config() -> dict:
    path = ROOT / "config.toml"
    if not path.exists():
        return {}
    try:
        with path.open("rb") as f:
            return tomllib.load(f).get("app", {})
    except Exception:
        return {}


_CFG = _load_config()


def _setting(key: str, default: str = "") -> str:
    return str(os.environ.get(key.upper()) or _CFG.get(key) or default)


PEXELS_KEY = _setting("pexels_api_key")
PIXABAY_KEY = _setting("pixabay_api_key")
FONT = _setting("font_path", "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc")
MAX_CHARS = int(_setting("max_script_chars", "1500"))
MAX_SECONDS = int(_setting("max_video_seconds", "180"))
UA = "MoneyPrinterTurbo/1.3.7 (hosted)"

VOICES = [
    {"id": "zh-CN-XiaoxiaoNeural", "label": "zh-CN-Xiaoxiao-女性"},
    {"id": "zh-CN-XiaoyiNeural", "label": "zh-CN-Xiaoyi-女性"},
    {"id": "zh-CN-XiaochenNeural", "label": "zh-CN-Xiaochen-女性"},
    {"id": "zh-CN-XiaohanNeural", "label": "zh-CN-Xiaohan-女性"},
    {"id": "zh-CN-YunxiNeural", "label": "zh-CN-Yunxi-男性"},
    {"id": "zh-CN-YunyangNeural", "label": "zh-CN-Yunyang-男性"},
    {"id": "zh-CN-YunjianNeural", "label": "zh-CN-Yunjian-男性"},
    {"id": "en-US-JennyNeural", "label": "en-US-Jenny-Female"},
    {"id": "en-US-GuyNeural", "label": "en-US-Guy-Male"},
]

ASPECTS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
}

ProgressCb = Optional[Callable[[int, str], None]]


def ensure_dirs():
    TASKS.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)


def load_task(task_id: str) -> dict:
    path = TASKS / task_id / "task.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_task(task: dict):
    folder = TASKS / task["task_id"]
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "task.json").write_text(
        json.dumps(task, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def list_tasks(limit: int = 40) -> list[dict]:
    ensure_dirs()
    items = []
    for folder in TASKS.iterdir():
        meta = folder / "task.json"
        if meta.exists():
            try:
                items.append(json.loads(meta.read_text(encoding="utf-8")))
            except Exception:
                continue
    items.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return items[:limit]


def build_script(subject: str, custom: str, language: str) -> str:
    custom = (custom or "").strip()
    if custom:
        return custom
    subject = (subject or "").strip() or "日常生活中的美好瞬间"
    if language.startswith("en"):
        return (
            f"{subject}. In everyday life, small changes quietly reshape how we work, learn, and connect. "
            f"From morning routines to evening rest, new tools help us save time and notice what matters. "
            f"The future is not far away. It is already unfolding in ordinary moments."
        )
    return (
        f"{subject}。在日常生活里，细微的变化正在重塑我们的工作、学习和交流方式。"
        f"从清晨到夜晚，新的工具帮我们节省时间，也让我们看见真正重要的事情。"
        f"未来并不遥远，它已经悄悄发生在每一个普通的瞬间。"
    )


def split_sentences(script: str) -> list[str]:
    parts = re.split(r"(?<=[。！？.!?；;])\s*", script.strip())
    sentences = [p.strip() for p in parts if p.strip()]
    if not sentences:
        sentences = [script.strip()]
    merged: list[str] = []
    buf = ""
    for s in sentences:
        if len(buf) + len(s) < 18 and buf:
            buf += s
        else:
            if buf:
                merged.append(buf)
            buf = s
    if buf:
        merged.append(buf)
    return merged


def probe_duration(path: Path) -> float:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def run_ffmpeg(args: list[str], timeout: int = 180):
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-800:] or "ffmpeg failed")


async def synthesize_tts(text: str, voice: str, out_path: Path) -> None:
    text = text.strip()[:MAX_CHARS]
    last_error = None
    for attempt in range(3):
        try:
            communicate = __import__("edge_tts").Communicate(text, voice)
            await asyncio.wait_for(communicate.save(str(out_path)), timeout=45)
            if out_path.exists() and out_path.stat().st_size > 1000:
                return
        except Exception as exc:
            last_error = exc
            await asyncio.sleep(1.2)
    try:
        from gtts import gTTS
        lang = "zh-CN" if voice.startswith("zh") else "en"
        tmp = out_path.with_suffix(".gtts.mp3")
        gTTS(text=text, lang=lang.split("-")[0]).save(str(tmp))
        run_ffmpeg(["-i", str(tmp), "-ar", "44100", "-ac", "2", str(out_path)])
        tmp.unlink(missing_ok=True)
        if out_path.exists() and out_path.stat().st_size > 1000:
            return
    except Exception as exc:
        last_error = exc
    raise RuntimeError(f"failed to synthesize audio; verify the selected voice and TTS connectivity: {last_error}")


def pick_pexels_file(video: dict, portrait: bool) -> Optional[str]:
    files = video.get("video_files") or []
    ranked = []
    for f in files:
        w, h = int(f.get("width") or 0), int(f.get("height") or 0)
        if w < 480 or h < 480:
            continue
        is_p = h > w
        score = abs((h / max(w, 1)) - (16 / 9 if portrait else 9 / 16))
        if portrait == is_p:
            score -= 2
        if f.get("quality") == "hd":
            score -= 0.5
        ranked.append((score, f.get("link")))
    ranked.sort(key=lambda x: x[0])
    return ranked[0][1] if ranked else None


async def search_pexels(client: httpx.AsyncClient, query: str, portrait: bool, per_page: int = 8) -> list[str]:
    orient = "portrait" if portrait else "landscape"
    url = "https://api.pexels.com/videos/search"
    r = await client.get(
        url,
        params={"query": query, "per_page": per_page, "orientation": orient, "size": "medium"},
        headers={"Authorization": PEXELS_KEY, "User-Agent": UA},
        timeout=20,
    )
    r.raise_for_status()
    urls = []
    for v in r.json().get("videos") or []:
        link = pick_pexels_file(v, portrait)
        if link:
            urls.append(link)
    return urls


async def search_pixabay(client: httpx.AsyncClient, query: str, portrait: bool, per_page: int = 8) -> list[str]:
    r = await client.get(
        "https://pixabay.com/api/videos/",
        params={
            "key": PIXABAY_KEY,
            "q": query,
            "per_page": min(per_page, 20),
            "safesearch": "true",
            "video_type": "all",
        },
        headers={"User-Agent": UA},
        timeout=20,
    )
    r.raise_for_status()
    urls = []
    for hit in r.json().get("hits") or []:
        videos = hit.get("videos") or {}
        for quality in ("medium", "large", "small", "tiny"):
            item = videos.get(quality) or {}
            url = item.get("url")
            w, h = int(item.get("width") or 0), int(item.get("height") or 0)
            if not url or w < 320:
                continue
            if portrait and h >= w:
                urls.append(url)
                break
            if not portrait:
                urls.append(url)
                break
    return urls


async def download_file(client: httpx.AsyncClient, url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 40_000:
        return True
    try:
        async with client.stream("GET", url, headers={"User-Agent": UA}, timeout=40, follow_redirects=True) as r:
            r.raise_for_status()
            tmp = dest.with_suffix(dest.suffix + ".part")
            with tmp.open("wb") as f:
                async for chunk in r.aiter_bytes(64 * 1024):
                    f.write(chunk)
            tmp.replace(dest)
        return dest.exists() and dest.stat().st_size > 40_000
    except Exception:
        dest.unlink(missing_ok=True)
        return False


def write_ass(sentences: list[str], durations: list[float], path: Path, params: dict):
    width, height = ASPECTS.get(params.get("aspect", "9:16"), (1080, 1920))
    font_size = int(params.get("font_size") or 60)
    if params.get("aspect") == "16:9":
        font_size = max(42, int(font_size * 0.7))
    color = (params.get("text_color") or "#FFFFFF").lstrip("#")
    stroke = (params.get("stroke_color") or "#000000").lstrip("#")
    primary = f"&H00{color[4:6]}{color[2:4]}{color[0:2]}"
    outline_c = f"&H00{stroke[4:6]}{stroke[2:4]}{stroke[0:2]}"
    pos = params.get("subtitle_position") or "bottom"
    alignment = {"top": 8, "center": 5, "bottom": 2}.get(pos, 2)
    margin_v = 80 if pos == "bottom" else 48
    bg = "1" if params.get("subtitle_bg") else "0"
    stroke_w = float(params.get("stroke_width") or 1.5)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,WenQuanYi Micro Hei,{font_size},{primary},&H000000FF,{outline_c},&H80000000,-1,0,0,0,100,100,0,0,{3 if bg == '1' else 1},{stroke_w},0,{alignment},70,70,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def ts(sec: float) -> str:
        sec = max(0.0, sec)
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = sec % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    events = []
    t = 0.0
    for sent, dur in zip(sentences, durations):
        text = sent.replace("\n", " ").replace("{", "(").replace("}", ")")
        events.append(f"Dialogue: 0,{ts(t)},{ts(t + dur)},Default,,0,0,0,,{text}")
        t += dur
    path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")


def make_clip(src: Path, dest: Path, duration: float, aspect: str, speed: float):
    width, height = ASPECTS[aspect]
    src_dur = max(probe_duration(src), 1.0)
    use = min(duration / max(speed, 0.5), src_dur - 0.15)
    use = max(0.8, use)
    start = 0.0 if src_dur <= use + 0.2 else random.uniform(0, src_dur - use - 0.05)
    vf = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},fps=30,setpts=PTS/{speed}"
    )
    run_ffmpeg([
        "-ss", f"{start:.2f}", "-i", str(src), "-t", f"{use:.2f}",
        "-an", "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", str(dest),
    ], timeout=90)


def concat_clips(clips: list[Path], out: Path):
    list_file = out.with_suffix(".txt")
    list_file.write_text("".join(f"file '{c.as_posix()}'\n" for c in clips), encoding="utf-8")
    try:
        run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(out)], timeout=60)
    except RuntimeError:
        run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-an", str(out),
        ], timeout=120)


def mix_final(video: Path, audio: Path, ass: Path, out: Path, bgm_volume: float, voice_volume: float, enable_sub: bool):
    voice_vol = max(0.05, min(2.0, voice_volume / 100.0))
    bgm = max(0.0, min(1.0, bgm_volume / 100.0)) * 0.35
    filter_parts = [
        f"[1:a]volume={voice_vol}[voice]",
        f"anoisesrc=color=pink:amplitude=0.015:sample_rate=44100,aformat=channel_layouts=stereo,volume={bgm}[bgm]",
        "[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
    ]
    vf = []
    if enable_sub:
        ass_path = ass.as_posix().replace("\\", "/").replace(":", "\\:")
        fonts_dir = "/usr/share/fonts/truetype/wqy"
        vf.append(f"ass={ass_path}:fontsdir={fonts_dir}")
    args = ["-i", str(video), "-i", str(audio)]
    if vf:
        filter_parts.append(f"[0:v]{','.join(vf)}[vout]")
        args += ["-filter_complex", ";".join(filter_parts), "-map", "[vout]", "-map", "[aout]"]
    else:
        args += ["-filter_complex", ";".join(filter_parts), "-map", "0:v", "-map", "[aout]"]
    args += [
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out),
    ]
    run_ffmpeg(args, timeout=180)


async def collect_materials(terms: list[str], source: str, portrait: bool, need: int) -> list[Path]:
    ensure_dirs()
    urls: list[str] = []
    async with httpx.AsyncClient() as client:
        for term in terms:
            try:
                if source in ("pexels", "auto"):
                    urls.extend(await search_pexels(client, term, portrait, per_page=6))
                if source in ("pixabay", "auto") and len(urls) < need * 3:
                    urls.extend(await search_pixabay(client, term, portrait, per_page=6))
            except Exception:
                continue
            if len(urls) >= need * 4:
                break
        if not urls:
            fallback = ["nature", "city", "people", "technology", "ocean"]
            for term in fallback:
                try:
                    urls.extend(await search_pexels(client, term, portrait, per_page=8))
                except Exception:
                    continue
                if len(urls) >= need:
                    break
        seen = set()
        unique = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                unique.append(u)
        random.shuffle(unique)
        files: list[Path] = []
        for i, url in enumerate(unique[: max(need * 2, need)]):
            dest = CACHE / f"{abs(hash(url)) % 10**12}.mp4"
            ok = await download_file(client, url, dest)
            if ok:
                files.append(dest)
            if len(files) >= need:
                break
    return files


async def generate_video(task: dict, progress: ProgressCb = None):
    def report(pct: int, stage: str, extra: dict | None = None):
        task["progress"] = pct
        task["stage"] = stage
        task["updated_at"] = time.time()
        if extra:
            task.update(extra)
        save_task(task)
        if progress:
            progress(pct, stage)

    params = task["params"]
    folder = TASKS / task["task_id"]
    folder.mkdir(parents=True, exist_ok=True)
    report(5, "script")
    script = build_script(params.get("video_subject", ""), params.get("video_script", ""), params.get("language", "zh-CN"))
    if len(script) > MAX_CHARS:
        raise RuntimeError(f"script is too long ({len(script)} chars); keep it under {MAX_CHARS} characters for about {MAX_SECONDS}s of video")
    sentences = split_sentences(script)
    terms = subject_to_terms(params.get("video_subject") or script, params.get("video_terms", ""))
    task["script"] = script
    task["terms"] = terms
    report(15, "terms", {"script": script, "terms": terms})

    report(22, "audio")
    voice = params.get("voice_name") or "zh-CN-XiaoxiaoNeural"
    audio_path = folder / "audio.mp3"
    await synthesize_tts(script, voice, audio_path)
    audio_dur = probe_duration(audio_path)
    if audio_dur <= 0.4:
        raise RuntimeError("failed to synthesize audio; verify the selected voice and TTS connectivity")
    if audio_dur > MAX_SECONDS:
        raise RuntimeError(f"narration is {int(audio_dur)}s; keep the script shorter so the video stays within {MAX_SECONDS}s")
    task["duration"] = round(audio_dur, 2)
    report(45, "materials")

    weights = [max(1.0, len(s)) for s in sentences]
    total_w = sum(weights) or 1
    durations = [audio_dur * w / total_w for w in weights]
    clip_max = float(params.get("clip_duration") or 3)
    need = max(len(sentences), math.ceil(audio_dur / max(1.5, min(clip_max, 6))))
    need = min(24, max(3, need))
    portrait = params.get("aspect", "9:16") == "9:16"
    source = params.get("video_source") or "pexels"
    materials = await collect_materials(terms, source, portrait, need)
    if not materials:
        raise RuntimeError("no stock footage found; try different keywords or another video source")
    report(62, "compose")

    speed = min(2.0, max(0.5, float(params.get("clip_speed") or 1.0)))
    aspect = params.get("aspect") or "9:16"
    clips = []
    remain = audio_dur
    idx = 0
    while remain > 0.25 and idx < 30:
        src = materials[idx % len(materials)]
        piece = min(clip_max, remain + 0.15)
        dest = folder / f"clip-{idx:02d}.mp4"
        try:
            make_clip(src, dest, piece, aspect, speed)
            clips.append(dest)
            remain -= probe_duration(dest)
        except Exception:
            remain -= piece
        idx += 1
    if not clips:
        raise RuntimeError("failed to compose video clips")
    combined = folder / "combined.mp4"
    concat_clips(clips, combined)
    report(78, "subtitles")
    ass = folder / "subtitle.ass"
    write_ass(sentences, durations, ass, params)
    report(86, "render")
    final = folder / "final-1.mp4"
    enable_sub = bool(params.get("subtitle_enabled", True))
    try:
        mix_final(
            combined,
            audio_path,
            ass,
            final,
            float(params.get("bgm_volume") or 20),
            float(params.get("voice_volume") or 100),
            enable_sub,
        )
    except RuntimeError:
        mix_final(
            combined,
            audio_path,
            ass,
            final,
            float(params.get("bgm_volume") or 20),
            float(params.get("voice_volume") or 100),
            False,
        )
    if not final.exists() or final.stat().st_size < 10_000:
        raise RuntimeError("video render produced an empty file")
    for clip in clips:
        clip.unlink(missing_ok=True)
    combined.unlink(missing_ok=True)
    task["video"] = f"/api/v1/videos/{task['task_id']}/file"
    task["preview"] = f"/api/v1/videos/{task['task_id']}/preview"
    task["download"] = f"/api/v1/videos/{task['task_id']}/download"
    task["file_size"] = final.stat().st_size
    task["duration"] = round(probe_duration(final) or audio_dur, 2)
    report(100, "complete")
    task["state"] = "complete"
    save_task(task)
    return task
