const form = document.getElementById("gen-form");
const voicesEl = document.getElementById("voice-name");
const bar = document.getElementById("bar");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const logEl = document.getElementById("log");
const previewCard = document.getElementById("preview-card");
const player = document.getElementById("player");
const dl = document.getElementById("dl");
const meta = document.getElementById("meta");
const submitBtn = document.getElementById("submit-btn");
const charHint = document.getElementById("char-hint");

const STAGE = {
  queued: "排队中",
  start: "启动任务",
  script: "生成文案",
  terms: "匹配关键词",
  audio: "合成配音",
  materials: "下载素材",
  compose: "拼接画面",
  subtitles: "渲染字幕",
  render: "导出成片",
  complete: "完成",
  failed: "失败",
};

function bindRange(name, labelId, fmt) {
  const input = form.elements[name];
  const label = document.getElementById(labelId);
  const sync = () => { label.textContent = fmt(input.value); };
  input.addEventListener("input", sync);
  sync();
}
bindRange("clip_duration", "clip-val", v => v);
bindRange("clip_speed", "speed-val", v => Number(v).toFixed(2) + "x");
bindRange("voice_volume", "vol-val", v => v + "%");
bindRange("voice_rate", "rate-val", v => Number(v).toFixed(1) + "×");
bindRange("bgm_volume", "bgm-val", v => v + "%");
bindRange("font_size", "fs-val", v => v);
bindRange("stroke_width", "sw-val", v => Number(v).toFixed(2));

form.elements.video_script.addEventListener("input", () => {
  const n = form.elements.video_script.value.length;
  charHint.textContent = n + " / 1500 字";
  charHint.style.color = n > 1500 ? "#f31260" : "";
});

function formData() {
  const fd = new FormData(form);
  const obj = Object.fromEntries(fd.entries());
  obj.clip_duration = Number(obj.clip_duration);
  obj.clip_speed = Number(obj.clip_speed);
  obj.voice_volume = Number(obj.voice_volume);
  obj.voice_rate = Number(obj.voice_rate);
  obj.bgm_volume = Number(obj.bgm_volume);
  obj.font_size = Number(obj.font_size);
  obj.stroke_width = Number(obj.stroke_width);
  obj.video_count = 1;
  obj.subtitle_enabled = form.elements.subtitle_enabled.checked;
  obj.subtitle_bg = form.elements.subtitle_bg.checked;
  obj.rounded_subtitle_bg = form.elements.rounded_subtitle_bg.checked;
  return obj;
}

function log(msg) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function showPreview(task) {
  previewCard.hidden = false;
  const src = task.preview || `/api/v1/videos/${task.task_id}/preview`;
  player.src = src;
  dl.href = task.download || `/api/v1/videos/${task.task_id}/download`;
  const mb = task.file_size ? (task.file_size / 1024 / 1024).toFixed(2) + " MB" : "";
  meta.textContent = `时长 ${task.duration || "-"} 秒  ${mb}  任务 ${task.task_id}`;
}

async function poll(taskId) {
  statusCard.hidden = false;
  for (;;) {
    const res = await fetch("/api/v1/videos/" + taskId);
    const task = await res.json();
    bar.style.width = (task.progress || 0) + "%";
    const label = STAGE[task.stage] || task.stage || "";
    statusText.textContent = `进度: ${task.progress || 0}%  ${label}`;
    if (task.state === "complete") {
      log("完成: " + task.task_id);
      showPreview(task);
      submitBtn.disabled = false;
      loadTasks();
      return;
    }
    if (task.state === "failed") {
      statusText.textContent = "视频生成失败: " + (task.error || "unknown");
      log("失败: " + task.error);
      submitBtn.disabled = false;
      loadTasks();
      return;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  previewCard.hidden = true;
  logEl.textContent = "";
  statusCard.hidden = false;
  bar.style.width = "2%";
  statusText.textContent = "正在生成视频，请稍候...";
  const payload = formData();
  const res = await fetch("/api/v1/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    statusText.textContent = data.detail || "提交失败";
    submitBtn.disabled = false;
    return;
  }
  log("任务已创建: " + data.task_id);
  poll(data.task_id);
});

document.getElementById("copy-link").addEventListener("click", async () => {
  if (!dl.href) return;
  await navigator.clipboard.writeText(dl.href);
  document.getElementById("copy-link").textContent = "已复制";
  setTimeout(() => document.getElementById("copy-link").textContent = "复制下载链接", 1500);
});

async function loadVoices() {
  const res = await fetch("/api/v1/options");
  const data = await res.json();
  voicesEl.innerHTML = (data.voices || []).map(v =>
    `<option value="${v.id}">${v.label}</option>`
  ).join("");
}

async function loadTasks() {
  const res = await fetch("/api/v1/videos");
  const data = await res.json();
  const box = document.getElementById("task-list");
  if (!data.items.length) {
    box.innerHTML = "<p class='hint'>还没有任务。填写主题后点击生成视频。</p>";
    return;
  }
  box.innerHTML = data.items.map(t => {
    const title = (t.params && (t.params.video_subject || t.params.video_script)) || t.task_id;
    const cls = t.state === "complete" ? "ok" : t.state === "failed" ? "err" : "warn";
    const actions = t.state === "complete"
      ? `<a href="/api/v1/videos/${t.task_id}/preview" target="_blank">预览</a> <a href="/api/v1/videos/${t.task_id}/download">下载</a>`
      : "";
    return `<div class="task"><b title="${title}">${title}</b><span class="${cls}">${STAGE[t.state] || t.state} ${t.progress || 0}%</span><span>${t.duration ? t.duration + "s" : "-"}</span><span>${actions}</span></div>`;
  }).join("");
}

loadVoices();
loadTasks();
