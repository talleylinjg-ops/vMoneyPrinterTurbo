<template>
  <div class="docs">
    <h2>SaaS API 文档</h2>
    <p class="sub">注册拿 Key，提交主题即可生成短视频。机器可读规格：<a :href="origin + '/openapi.json'">/openapi.json</a></p>

    <div class="doc-section">
      <h3>1. 认证</h3>
      <p>所有接口携带请求头 <code>x-api-key</code>。浏览器预览/下载可用 <code>?api_key=</code>。</p>
      <div class="code-block"><code>x-api-key: mpt_你的密钥</code></div>
      <p>Base URL：<code>{{ origin }}</code></p>
    </div>

    <div class="doc-section">
      <h3>2. 提交生成任务</h3>
      <p><code>POST {{ origin }}/api/proxy/v1/videos</code></p>
      <div class="code-block"><code>{{ createBody }}</code></div>
      <p>返回 <code>{"task_id":"...","state":"queued"}</code>。主题和文案至少填一项。</p>
    </div>

    <div class="doc-section">
      <h3>3. 轮询进度</h3>
      <p><code>GET {{ origin }}/api/proxy/v1/videos/{task_id}</code></p>
      <p><code>state=complete</code> 可预览下载；<code>failed</code> 看 <code>error</code>。兼容 <code>/api/proxy/v1/tasks/{task_id}</code>。</p>
    </div>

    <div class="doc-section">
      <h3>4. 预览与下载</h3>
      <div class="code-block"><code>GET {{ origin }}/api/proxy/v1/videos/{task_id}/preview
GET {{ origin }}/api/proxy/v1/videos/{task_id}/download</code></div>
      <p>成片落盘，刷新后仍可用同一 task_id。这是全新生成，没有时间轴精修接口。</p>
    </div>

    <div class="doc-section">
      <h3>5. curl</h3>
      <button class="copy" type="button" @click="copy(curlText)">复制</button>
      <div class="code-block"><code>{{ curlText }}</code></div>
    </div>

    <div class="doc-section">
      <h3>6. Python</h3>
      <button class="copy" type="button" @click="copy(pyText)">复制</button>
      <div class="code-block"><code>{{ pyText }}</code></div>
    </div>

    <div class="doc-section">
      <h3>7. JavaScript</h3>
      <button class="copy" type="button" @click="copy(jsText)">复制</button>
      <div class="code-block"><code>{{ jsText }}</code></div>
    </div>

    <div class="doc-section">
      <h3>8. 参数</h3>
      <table>
        <thead>
          <tr><th>字段</th><th>说明</th><th>默认</th></tr>
        </thead>
        <tbody>
          <tr><td>video_subject</td><td>主题</td><td>必填（或填文案）</td></tr>
          <tr><td>video_script</td><td>旁白，最多 1500 字</td><td>按主题生成</td></tr>
          <tr><td>aspect</td><td>9:16 / 16:9 / 1:1</td><td>9:16</td></tr>
          <tr><td>video_source</td><td>pexels / pixabay / auto</td><td>pexels</td></tr>
          <tr><td>voice_name</td><td>Edge TTS 音色</td><td>zh-CN-XiaoxiaoNeural</td></tr>
          <tr><td>subtitle_enabled</td><td>字幕</td><td>true</td></tr>
        </tbody>
      </table>
      <p>成片约 180 秒。完全免费，不调用大模型。</p>
    </div>

    <div class="doc-section" id="faq">
      <h3>9. 常见问题</h3>
      <article>
        <h4>引擎直连需要 API Key 吗？</h4>
        <p>门户 /api/proxy/v1/videos 需要 x-api-key。引擎直连 /api/v1/videos 开放调用。</p>
      </article>
      <article>
        <h4>完成态是什么？</h4>
        <p>成功为 complete，失败为 failed。不要用 succeeded 判断。</p>
      </article>
      <article>
        <h4>能精修已有视频吗？</h4>
        <p>不能。这是全新生成流水线，没有时间轴精修接口。改内容需重新 POST。</p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const origin = typeof window !== "undefined" ? window.location.origin : "";
const createBody = `{
  "video_subject": "春天适合出发",
  "video_script": "",
  "aspect": "9:16",
  "video_source": "pexels"
}`;

const curlText = computed(
  () => `# 创建
curl -X POST ${origin}/api/proxy/v1/videos \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: mpt_你的密钥" \\
  -d '{"video_subject":"春天适合出发","aspect":"9:16"}'

# 轮询，直到 state=complete
curl ${origin}/api/proxy/v1/videos/TASK_ID \\
  -H "x-api-key: mpt_你的密钥"

# 下载
curl -L "${origin}/api/proxy/v1/videos/TASK_ID/download?api_key=mpt_你的密钥" -o video.mp4`
);

const pyText = computed(
  () => `import time, requests
BASE = "${origin}"
KEY = "mpt_你的密钥"
h = {"x-api-key": KEY, "Content-Type": "application/json"}
r = requests.post(f"{BASE}/api/proxy/v1/videos", headers=h, json={
    "video_subject": "春天适合出发", "aspect": "9:16"
})
r.raise_for_status()
task_id = r.json()["task_id"]
while True:
    s = requests.get(f"{BASE}/api/proxy/v1/videos/{task_id}", headers=h).json()
    if s["state"] == "complete":
        break
    if s["state"] == "failed":
        raise RuntimeError(s.get("error"))
    time.sleep(2)
open("video.mp4","wb").write(requests.get(
    f"{BASE}/api/proxy/v1/videos/{task_id}/download", headers=h).content)`
);

const jsText = computed(
  () => `const BASE = "${origin}";
const KEY = "mpt_你的密钥";
const headers = { "Content-Type": "application/json", "x-api-key": KEY };
const created = await fetch(BASE + "/api/proxy/v1/videos", {
  method: "POST", headers, body: JSON.stringify({ video_subject: "春天适合出发", aspect: "9:16" })
}).then(r => r.json());
let state = created.state;
while (state !== "complete") {
  const s = await fetch(BASE + "/api/proxy/v1/videos/" + created.task_id, { headers }).then(r => r.json());
  if (s.state === "failed") throw new Error(s.error || "failed");
  state = s.state;
  if (state !== "complete") await new Promise(r => setTimeout(r, 2000));
}
const blob = await fetch(BASE + "/api/proxy/v1/videos/" + created.task_id + "/download", { headers }).then(r => r.blob());`
);

async function copy(text) {
  await navigator.clipboard.writeText(text);
}
</script>

<style scoped>
.docs {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 20px;
}

.docs h2 {
  font-size: 32px;
  margin-bottom: 8px;
}

.sub {
  color: #6b7280;
  margin-bottom: 32px;
}

.doc-section {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  position: relative;
}

.doc-section h3 {
  margin-bottom: 14px;
  color: #2c3e50;
}

.doc-section p {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 12px;
}

.code-block {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.code-block code {
  color: #e2e8f0;
  font-size: 13px;
  font-family: "SF Mono", Consolas, monospace;
  line-height: 1.7;
  white-space: pre;
}

.copy {
  position: absolute;
  right: 24px;
  top: 24px;
  background: #4f6ef7;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 10px 12px;
  border: 1px solid #eee;
  text-align: left;
}

th {
  background: #f8fafc;
}

#faq article { margin: 12px 0 0; }
#faq h4 { margin: 0 0 6px; font-size: 15px; color: #2c3e50; }
</style>
