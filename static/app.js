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
  materials: "准备画面",
  compose: "拼接画面",
  subtitles: "渲染字幕",
  render: "导出成片",
  complete: "完成",
  failed: "失败",
};

const VOICES = [
  { id: "zh-CN-XiaoxiaoNeural", label: "zh-CN-Xiaoxiao-女性", lang: "zh-CN" },
  { id: "zh-CN-XiaoyiNeural", label: "zh-CN-Xiaoyi-女性", lang: "zh-CN" },
  { id: "zh-CN-XiaochenNeural", label: "zh-CN-Xiaochen-女性", lang: "zh-CN" },
  { id: "zh-CN-XiaohanNeural", label: "zh-CN-Xiaohan-女性", lang: "zh-CN" },
  { id: "zh-CN-YunxiNeural", label: "zh-CN-Yunxi-男性", lang: "zh-CN" },
  { id: "zh-CN-YunyangNeural", label: "zh-CN-Yunyang-男性", lang: "zh-CN" },
  { id: "zh-CN-YunjianNeural", label: "zh-CN-Yunjian-男性", lang: "zh-CN" },
  { id: "en-US-JennyNeural", label: "en-US-Jenny-Female", lang: "en-US" },
  { id: "en-US-GuyNeural", label: "en-US-Guy-Male", lang: "en-US" },
];

const ZH_EN = {
  人工智能: "artificial intelligence technology",
  AI: "artificial intelligence",
  科技: "technology innovation",
  生活: "daily life lifestyle",
  日常: "everyday life",
  城市: "city skyline urban",
  自然: "nature landscape",
  海洋: "ocean sea underwater",
  森林: "forest trees sunlight",
  咖啡: "coffee cafe",
  旅行: "travel adventure",
  春天: "spring flowers",
  夏天: "summer beach",
  秋天: "autumn leaves",
  冬天: "winter snow",
  太空: "space galaxy",
  机器人: "robotics robot",
  未来: "futuristic city",
  美食: "food cooking",
  音乐: "music concert",
  家庭: "family home",
  夜晚: "night city lights",
  数据: "data analytics",
  医疗: "medical hospital",
  环保: "environment green",
};

const ASPECTS = {
  "9:16": [720, 1280],
  "16:9": [1280, 720],
  "1:1": [960, 960],
};

const DB_NAME = "mpt-static";
const STORE = "tasks";
const MAX_CHARS = 1500;
const MAX_SECONDS = 180;

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
bindRange("clip_speed", "cs-val", v => Number(v).toFixed(2) + "x");

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
  obj.video_count = Number(obj.video_count || 1);
  obj.subtitle_enabled = form.elements.subtitle_enabled.checked;
  obj.subtitle_bg = form.elements.subtitle_bg.checked;
  obj.rounded_subtitle_bg = form.elements.rounded_subtitle_bg.checked;
  return obj;
}

function log(msg) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function buildScript(subject, custom, language) {
  const text = (custom || "").trim();
  if (text) return text.slice(0, MAX_CHARS);
  const topic = (subject || "").trim() || "日常生活中的美好瞬间";
  if (String(language || "").startsWith("en")) {
    return (
      `${topic}. In everyday life, small changes quietly reshape how we work, learn, and connect. ` +
      `From morning routines to evening rest, new tools help us save time and notice what matters. ` +
      `The future is not far away. It is already unfolding in ordinary moments.`
    ).slice(0, MAX_CHARS);
  }
  return (
    `${topic}。在日常生活里，细微的变化正在重塑我们的工作、学习和交流方式。` +
    `从清晨到夜晚，新的工具帮我们节省时间，也让我们看见真正重要的事情。` +
    `未来并不遥远，它已经悄悄发生在每一个普通的瞬间。`
  ).slice(0, MAX_CHARS);
}

function subjectToTerms(subject, extra) {
  const terms = [];
  const extraText = (extra || "").trim();
  if (extraText) {
    extraText.replace(/[，、]/g, ",").split(",").forEach((part) => {
      const word = part.trim();
      if (word) terms.push(word);
    });
  }
  const text = subject || "";
  Object.entries(ZH_EN).forEach(([zh, en]) => {
    if (text.includes(zh) && !terms.includes(en)) terms.push(en);
  });
  text.replace(/,/g, " ").split(/\s+/).forEach((w) => {
    if (/^[A-Za-z]{3,}$/.test(w)) terms.push(w);
  });
  if (!terms.length) terms.push("nature landscape", "city lifestyle", "technology");
  const seen = new Set();
  const unique = [];
  terms.forEach((t) => {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  });
  return unique.slice(0, 8);
}

function splitSentences(script) {
  const parts = script.split(/(?<=[。！？.!?；;])\s*/);
  const sentences = parts.map((p) => p.trim()).filter(Boolean);
  if (!sentences.length) return [script.trim()].filter(Boolean);
  const merged = [];
  let buf = "";
  sentences.forEach((s) => {
    if (buf && buf.length + s.length < 18) buf += s;
    else {
      if (buf) merged.push(buf);
      buf = s;
    }
  });
  if (buf) merged.push(buf);
  return merged;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "task_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTask(task) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(task);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function listTasks() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

async function getTask(id) {
  const db = await openDb();
  const task = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return task;
}

const blobUrls = new Map();

function blobUrlFor(task) {
  if (!task || !task.blob) return "";
  if (blobUrls.has(task.task_id)) return blobUrls.get(task.task_id);
  const url = URL.createObjectURL(task.blob);
  blobUrls.set(task.task_id, url);
  return url;
}

function showPreview(task) {
  previewCard.hidden = false;
  const src = blobUrlFor(task);
  player.src = src;
  dl.href = src;
  dl.download = (task.filename || "moneyprinterturbo") + ".webm";
  const mb = task.file_size ? (task.file_size / 1024 / 1024).toFixed(2) + " MB" : "";
  meta.textContent = `时长 ${task.duration || "-"} 秒  ${mb}  任务 ${task.task_id}`;
}

function setProgress(pct, stage) {
  bar.style.width = pct + "%";
  statusText.textContent = `进度: ${pct}%  ${STAGE[stage] || stage || ""}`;
}

function hashHue(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}

function wrapText(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let line = "";
  chars.forEach((ch) => {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function drawSlide(ctx, w, h, sentence, params, index, total) {
  const hue = (hashHue(sentence) + index * 28) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 42% 18%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360} 48% 28%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `hsla(${(hue + 60) % 360} 70% 60% / 0.18)`;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  if (!params.subtitle_enabled) return;
  const fontPx = Math.max(28, Math.round((Number(params.font_size) || 60) * (w / 1080)));
  ctx.font = `700 ${fontPx}px "Source Sans Pro","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, sentence, w * 0.82);
  const lineH = fontPx * 1.25;
  const blockH = lines.length * lineH + 24;
  let y;
  const pos = params.subtitle_position || "bottom";
  if (pos === "top") y = 48 + blockH / 2;
  else if (pos === "center") y = h / 2;
  else y = h - 56 - blockH / 2;
  const cx = w / 2;
  if (params.subtitle_bg) {
    ctx.fillStyle = params.subtitle_bg_color || "#000000";
    ctx.globalAlpha = 0.55;
    const bw = Math.min(w * 0.9, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 48);
    const x = (w - bw) / 2;
    const by = y - blockH / 2;
    if (params.rounded_subtitle_bg) {
      const r = 18;
      ctx.beginPath();
      ctx.moveTo(x + r, by);
      ctx.arcTo(x + bw, by, x + bw, by + blockH, r);
      ctx.arcTo(x + bw, by + blockH, x, by + blockH, r);
      ctx.arcTo(x, by + blockH, x, by, r);
      ctx.arcTo(x, by, x + bw, by, r);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, by, bw, blockH);
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = Math.max(1, Number(params.stroke_width) || 1.5);
  ctx.strokeStyle = params.stroke_color || "#000000";
  ctx.fillStyle = params.text_color || "#FFFFFF";
  lines.forEach((line, i) => {
    const ly = y - ((lines.length - 1) * lineH) / 2 + i * lineH;
    ctx.strokeText(line, cx, ly);
    ctx.fillText(line, cx, ly);
  });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 ${Math.max(14, Math.round(w / 48))}px sans-serif`;
  ctx.fillText(`${index + 1} / ${total}`, w / 2, 28);
}

function pickMime() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "video/webm";
}

function speakPreview(text, voiceId) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error("浏览器不支持语音合成"));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const meta = VOICES.find((v) => v.id === voiceId);
    utter.lang = meta?.lang || "zh-CN";
    const all = window.speechSynthesis.getVoices();
    const match = all.find((v) => v.lang.startsWith(utter.lang)) || all[0];
    if (match) utter.voice = match;
    utter.onend = resolve;
    utter.onerror = () => reject(new Error("试听失败"));
    window.speechSynthesis.speak(utter);
  });
}

async function renderVideo(params, sentences, onProgress) {
  const [w, h] = ASPECTS[params.aspect] || ASPECTS["9:16"];
  const clip = Math.min(10, Math.max(2, Number(params.clip_duration) || 3));
  let duration = sentences.length * clip;
  if (duration > MAX_SECONDS) {
    const keep = Math.max(1, Math.floor(MAX_SECONDS / clip));
    sentences = sentences.slice(0, keep);
    duration = sentences.length * clip;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const stream = canvas.captureStream(30);
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();

  const fps = 30;
  for (let i = 0; i < sentences.length; i++) {
    onProgress(55 + Math.round((i / sentences.length) * 30), i === 0 ? "compose" : "subtitles");
    const frames = clip * fps;
    for (let f = 0; f < frames; f++) {
      drawSlide(ctx, w, h, sentences[i], params, i, sentences.length);
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: mime });
  return { blob, duration, mime };
}

async function generate(params) {
  const taskId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  let task = {
    task_id: taskId,
    state: "queued",
    stage: "start",
    progress: 2,
    params,
    created_at: Date.now(),
    duration: 0,
    file_size: 0,
  };
  await saveTask(task);
  setProgress(8, "start");
  const script = buildScript(params.video_subject, params.video_script, params.language);
  if (!script) throw new Error("请先填写视频主题或文案");
  form.elements.video_script.value = script;
  form.elements.video_script.dispatchEvent(new Event("input"));
  setProgress(18, "script");
  const terms = subjectToTerms(params.video_subject || script, params.video_terms);
  form.elements.video_terms.value = terms.join(", ");
  setProgress(28, "terms");
  setProgress(40, "audio");
  const sentences = splitSentences(script);
  setProgress(50, "materials");
  const { blob, duration } = await renderVideo(params, sentences, setProgress);
  setProgress(92, "render");
  const subject = (params.video_subject || "moneyprinterturbo").replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
  task = {
    ...task,
    state: "complete",
    stage: "complete",
    progress: 100,
    blob,
    duration,
    file_size: blob.size,
    filename: subject || "moneyprinterturbo",
    params: { ...params, video_script: script, video_terms: terms.join(", ") },
  };
  await saveTask(task);
  setProgress(100, "complete");
  return task;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  previewCard.hidden = true;
  logEl.textContent = "";
  statusCard.hidden = false;
  bar.style.width = "2%";
  statusText.textContent = "正在浏览器内生成视频，请稍候...";
  const payload = formData();
  try {
    const task = await generate(payload);
    log("完成: " + task.task_id);
    showPreview(task);
    loadTasks();
  } catch (err) {
    statusText.textContent = "视频生成失败: " + (err.message || err);
    log("失败: " + (err.message || err));
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("copy-link").addEventListener("click", async () => {
  if (!dl.href) return;
  await navigator.clipboard.writeText(dl.href);
  document.getElementById("copy-link").textContent = "已复制";
  setTimeout(() => document.getElementById("copy-link").textContent = "复制下载链接", 1500);
});

function loadVoices() {
  voicesEl.innerHTML = VOICES.map((v) => `<option value="${v.id}">${v.label}</option>`).join("");
}

async function loadTasks() {
  const box = document.getElementById("task-list");
  try {
    const items = await listTasks();
    if (!items.length) {
      box.innerHTML = "<p class='hint'>还没有任务。填写主题后点击生成视频。成片保存在本机浏览器。</p>";
      return;
    }
    box.innerHTML = items.map((t) => {
      const title = (t.params && (t.params.video_subject || t.params.video_script)) || t.task_id;
      const cls = t.state === "complete" ? "ok" : t.state === "failed" ? "err" : "warn";
      const actions = t.state === "complete"
        ? `<button type="button" class="task-preview" data-id="${t.task_id}">预览</button>`
        : "";
      return `<div class="task"><b title="${title}">${title}</b><span class="${cls}">${STAGE[t.state] || t.state} ${t.progress || 0}%</span><span>${t.duration ? t.duration + "s" : "-"}</span><span>${actions}</span></div>`;
    }).join("");
    box.querySelectorAll(".task-preview").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const task = await getTask(id);
        if (task) showPreview(task);
        closePopovers();
        previewCard.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  } catch {
    box.innerHTML = "<p class='hint'>本机任务存储不可用。仍可生成，但刷新后无法取回。</p>";
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
    await speakPreview("MoneyPrinterTurbo 免费配音试听。", voice);
    setPreviewVoiceLabel("试听配音");
  } catch {
    setPreviewVoiceLabel("试听失败");
    setTimeout(() => { setPreviewVoiceLabel("试听配音"); previewVoiceBtn.disabled = false; }, 1600);
    return;
  }
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

function openSettings() {
  setOpen(taskPopover, false);
  setOpen(settingsPopover, true);
  settingsBtn.setAttribute("aria-expanded", "true");
  taskToggle.setAttribute("aria-expanded", "false");
}

document.getElementById("open-llm").addEventListener("click", (e) => {
  e.preventDefault();
  openSettings();
});
document.getElementById("open-material").addEventListener("click", (e) => {
  e.preventDefault();
  openSettings();
});
document.getElementById("restore-prompt").addEventListener("click", () => {
  form.elements.custom_system_prompt.value = "";
  toast("已恢复默认系统提示词");
});
document.getElementById("preview-prompt").addEventListener("click", () => {
  const subject = form.elements.video_subject.value.trim() || "视频主题";
  const extra = form.elements.video_script_prompt.value.trim();
  toast("静态版不调用大模型，提示词仅作界面对齐");
  log("主题: " + subject + (extra ? "\n要求: " + extra : ""));
});
const uiLang = document.getElementById("ui-lang");
if (uiLang) {
  uiLang.addEventListener("change", () => {
    if (uiLang.value !== "zh") toast("界面文案为简体中文，语言列表与官方一致");
  });
}

document.getElementById("gen-script").addEventListener("click", () => {
  const subject = form.elements.video_subject.value.trim();
  if (!subject) {
    toast("请先填写视频主题");
    return;
  }
  const script = buildScript(subject, form.elements.video_script.value, form.elements.language.value || "zh-CN");
  const terms = subjectToTerms(subject || script, form.elements.video_terms.value);
  form.elements.video_script.value = script;
  form.elements.video_terms.value = terms.join(", ");
  form.elements.video_script.dispatchEvent(new Event("input"));
  toast("已生成本地文案和关键词");
});

document.getElementById("gen-terms").addEventListener("click", () => {
  const script = form.elements.video_script.value.trim();
  const subject = form.elements.video_subject.value.trim();
  if (!script) {
    toast("请先填写视频文案");
    return;
  }
  form.elements.video_terms.value = subjectToTerms(subject || script, "").join(", ");
  toast("已生成本地关键词");
});

document.getElementById("voice-mode").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.mode !== "tts") {
    toast("静态版使用浏览器语音合成试听，成片为字幕画面");
    return;
  }
  document.querySelectorAll("#voice-mode button").forEach((b) => b.classList.toggle("active", b === btn));
});

if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
}

loadVoices();
loadTasks();
