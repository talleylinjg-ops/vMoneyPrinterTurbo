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
  if (!input || !label) return;
  const sync = () => { label.textContent = fmt(input.value); };
  input.addEventListener("input", sync);
  sync();
}
bindRange("font_size", "fs-val", v => v);
bindRange("stroke_width", "sw-val", v => Number(v).toFixed(2));
bindRange("paragraph_number", "pn-val", v => v);

form.elements.video_script.addEventListener("input", () => {
  const n = form.elements.video_script.value.length;
  charHint.textContent = n + " / 1500 字";
  charHint.style.color = n > 1500 ? "#f31260" : "";
});

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function formData() {
  const fd = new FormData(form);
  const obj = Object.fromEntries(fd.entries());
  obj.language = obj.language || "zh-CN";
  if (concatMode && concatMode.disabled) obj.concat_mode = "sequential";
  obj.clip_duration = Number(obj.clip_duration);
  obj.clip_speed = Number(obj.clip_speed || 1);
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
    await new Promise(r => setTimeout(r, Number(task.poll_after_ms) || 1500));
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
  try {
    const res = await fetch("/api/v1/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusText.textContent = data.detail || data.error || "提交失败";
      submitBtn.disabled = false;
      return;
    }
    log("任务已创建: " + data.task_id);
    poll(data.task_id);
  } catch {
    statusText.textContent = "后端暂时不可用，浏览页仍可打开。请稍后重试生成。";
    submitBtn.disabled = false;
  }
});

document.getElementById("copy-link").addEventListener("click", async () => {
  if (!dl.href) return;
  await navigator.clipboard.writeText(dl.href);
  document.getElementById("copy-link").textContent = "已复制";
  setTimeout(() => document.getElementById("copy-link").textContent = "复制下载链接", 1500);
});

async function loadVoices() {
  try {
    const res = await fetch("/api/v1/options");
    if (!res.ok) throw new Error("options unavailable");
    const data = await res.json();
    voicesEl.innerHTML = (data.voices || []).map(v =>
      `<option value="${v.id}">${v.label}</option>`
    ).join("");
  } catch {
    voicesEl.innerHTML = `<option value="zh-CN-XiaoxiaoNeural">zh-CN-Xiaoxiao-女性</option>`;
  }
}

async function loadTasks() {
  const box = document.getElementById("task-list");
  try {
    const res = await fetch("/api/v1/videos");
    if (!res.ok) throw new Error("tasks unavailable");
    const data = await res.json();
    if (!data.items.length) {
      box.innerHTML = "<p class='hint'>还没有任务。填写主题后点击生成视频。</p>";
      return;
    }
    box.innerHTML = data.items.map(t => {
      const title = (t.params && (t.params.video_subject || t.params.video_script)) || t.task_id;
      const cls = t.state === "complete" ? "ok" : t.state === "failed" ? "err" : "warn";
      const actions = t.state === "complete"
        ? `<button type="button" class="task-preview" data-id="${t.task_id}">预览</button> <a href="/api/v1/videos/${t.task_id}/download">下载</a>`
        : "";
      return `<div class="task"><b title="${title}">${title}</b><span class="${cls}">${STAGE[t.state] || t.state} ${t.progress || 0}%</span><span>${t.duration ? t.duration + "s" : "-"}</span><span>${actions}</span></div>`;
    }).join("");
    box.querySelectorAll(".task-preview").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        showPreview({ task_id: id });
        closePopovers();
        previewCard.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  } catch {
    box.innerHTML = "<p class='hint'>任务列表需后端在线。浏览页已在边缘托管，生成/预览/下载时再回源。</p>";
  }
}

const taskToggle = document.getElementById("task-toggle");
const settingsBtn = document.getElementById("settings-btn");
const taskPopover = document.getElementById("task-popover");
const settingsPopover = document.getElementById("settings-popover");
const previewVoiceBtn = document.getElementById("preview-voice");
let previewAudio = null;

function setOpen(el, open) {
  el.hidden = !open;
  el.classList.toggle("open", open);
}

function closePopovers() {
  setOpen(taskPopover, false);
  setOpen(settingsPopover, false);
  taskToggle.setAttribute("aria-expanded", "false");
  settingsBtn.setAttribute("aria-expanded", "false");
}

taskToggle.setAttribute("aria-expanded", "false");
settingsBtn.setAttribute("aria-expanded", "false");
taskToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = taskPopover.hidden;
  setOpen(settingsPopover, false);
  settingsBtn.setAttribute("aria-expanded", "false");
  setOpen(taskPopover, open);
  taskToggle.setAttribute("aria-expanded", String(open));
  if (open) loadTasks();
});
settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = settingsPopover.hidden;
  setOpen(taskPopover, false);
  taskToggle.setAttribute("aria-expanded", "false");
  setOpen(settingsPopover, open);
  settingsBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (taskPopover.contains(e.target) || settingsPopover.contains(e.target)) return;
  if (e.target === taskToggle || e.target === settingsBtn) return;
  closePopovers();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopovers();
});

function setPreviewVoiceLabel(text) {
  const icon = previewVoiceBtn.querySelector("svg");
  previewVoiceBtn.textContent = "";
  if (icon) previewVoiceBtn.appendChild(icon);
  previewVoiceBtn.append(" " + text);
}

previewVoiceBtn.addEventListener("click", async () => {
  const voice = voicesEl.value;
  if (!voice) return;
  previewVoiceBtn.disabled = true;
  setPreviewVoiceLabel("试听中...");
  try {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    const url = `/api/v1/voices/preview?voice=${encodeURIComponent(voice)}`;
    previewAudio = new Audio(url);
    await previewAudio.play();
    previewAudio.addEventListener("ended", () => {
      setPreviewVoiceLabel("试听配音");
      previewVoiceBtn.disabled = false;
    }, { once: true });
  } catch (err) {
    setPreviewVoiceLabel("试听失败");
    setTimeout(() => { setPreviewVoiceLabel("试听配音"); previewVoiceBtn.disabled = false; }, 1600);
    return;
  }
  setPreviewVoiceLabel("播放中");
  previewVoiceBtn.disabled = false;
});
form.elements.subtitle_position.addEventListener("change", () => {
  document.getElementById("custom-pos-wrap").hidden = form.elements.subtitle_position.value !== "custom";
});
document.getElementById("reset-subtitle").addEventListener("click", () => {
  form.elements.subtitle_enabled.checked = true;
  form.elements.font_name.selectedIndex = 0;
  form.elements.subtitle_position.value = "bottom";
  document.getElementById("custom-pos-wrap").hidden = true;
  form.elements.text_color.value = "#FFFFFF";
  form.elements.stroke_color.value = "#000000";
  form.elements.font_size.value = 60;
  form.elements.stroke_width.value = 1.5;
  form.elements.subtitle_bg.checked = false;
  form.elements.subtitle_bg_color.value = "#000000";
  form.elements.rounded_subtitle_bg.checked = false;
  form.elements.font_size.dispatchEvent(new Event("input"));
  form.elements.stroke_width.dispatchEvent(new Event("input"));
});
const matchScript = document.getElementById("match-script");
const concatMode = form.elements.concat_mode;
let concatBeforeMatch = concatMode.value;
matchScript.addEventListener("change", () => {
  if (matchScript.checked) {
    concatBeforeMatch = concatMode.value;
    concatMode.value = "sequential";
    concatMode.disabled = true;
  } else {
    concatMode.disabled = false;
    concatMode.value = concatBeforeMatch || "random";
  }
});

document.getElementById("open-llm").addEventListener("click", (e) => {
  e.preventDefault();
  setOpen(taskPopover, false);
  setOpen(settingsPopover, true);
  settingsBtn.setAttribute("aria-expanded", "true");
  taskToggle.setAttribute("aria-expanded", "false");
});

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || data.message || "请求失败");
  return data;
}

document.getElementById("gen-script").addEventListener("click", async () => {
  const subject = form.elements.video_subject.value.trim();
  if (!subject) {
    toast("请先填写视频主题");
    return;
  }
  const btn = document.getElementById("gen-script");
  btn.disabled = true;
  try {
    const data = await postJson("/api/v1/script", {
      video_subject: subject,
      language: form.elements.language.value || "zh-CN",
      video_script: form.elements.video_script.value,
      video_terms: form.elements.video_terms.value,
    });
    form.elements.video_script.value = data.script || "";
    form.elements.video_terms.value = data.terms || "";
    form.elements.video_script.dispatchEvent(new Event("input"));
    toast("已生成本地文案和关键词");
  } catch (err) {
    toast(err.message || "生成失败");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("gen-terms").addEventListener("click", async () => {
  const script = form.elements.video_script.value.trim();
  const subject = form.elements.video_subject.value.trim();
  if (!script) {
    toast("请先填写视频文案");
    return;
  }
  const btn = document.getElementById("gen-terms");
  btn.disabled = true;
  try {
    const data = await postJson("/api/v1/terms", {
      video_subject: subject,
      video_script: script,
    });
    form.elements.video_terms.value = data.terms || "";
    toast("已生成本地关键词");
  } catch (err) {
    toast(err.message || "生成失败");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("voice-mode").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.mode !== "tts") {
    toast("托管版仅支持自动配音（Edge TTS）");
    return;
  }
  document.querySelectorAll("#voice-mode button").forEach((b) => b.classList.toggle("active", b === btn));
});

loadVoices();
loadTasks();
