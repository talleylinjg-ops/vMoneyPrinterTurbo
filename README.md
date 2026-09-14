# MoneyPrinterTurbo 托管版

独立可访问的中文短视频生成站点。放弃 LLM，使用 Pexels / Pixabay 免费素材和 Edge TTS 免费配音。

## 启动

```bash
pip3 install --break-system-packages -r requirements.txt
python3 -m uvicorn app:app --host 0.0.0.0 --port 8501
```

打开 WebUI 后填写主题，点击「生成视频」。成片会落盘到 `storage/tasks/{task_id}/final-1.mp4`，刷新页面后仍可预览和下载。

## SaaS 调用

```bash
curl -X POST http://HOST/api/v1/videos \
  -H 'Content-Type: application/json' \
  -d '{"video_subject":"人工智能如何改变日常生活","aspect":"9:16","video_source":"pexels"}'
```

轮询 `GET /api/v1/videos/{task_id}`，完成后用 `/preview` 预览、`/download` 下载。

限制：文案 1500 字以内，成片约 180 秒。这是全新生成流水线，不能在时间轴上精修已有视频。
