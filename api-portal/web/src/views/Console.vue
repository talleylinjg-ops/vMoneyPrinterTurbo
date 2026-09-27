<template>
  <div class="console">
    <h2>控制台</h2>
    <p v-if="!token" class="nologin">请先 <router-link to="/login">登录</router-link> 后使用控制台。</p>

    <template v-if="token && me">
      <div class="stat-cards">
        <div class="stat-card">
          <span>当前套餐</span>
          <strong>{{ me.membership?.plan_name || "无" }}</strong>
        </div>
        <div class="stat-card">
          <span>额度</span>
          <strong>不限次数</strong>
        </div>
        <div class="stat-card">
          <span>今日已用</span>
          <strong>{{ me.today_usage }} 次</strong>
        </div>
        <div class="stat-card">
          <span>累计使用</span>
          <strong>{{ me.total_usage }} 次</strong>
        </div>
      </div>

      <div class="panel generate">
        <h3>主题生成视频</h3>
        <p class="tip">只需主题或文案。画幅默认竖屏，其余参数由引擎使用免费素材和 Edge TTS 自动填充。</p>
        <form class="gen-form" @submit.prevent="submitVideo">
          <label>
            视频主题
            <input v-model="form.video_subject" maxlength="80" placeholder="例如：春天适合出发" />
          </label>
          <label>
            视频文案（可选，最多 1500 字）
            <textarea v-model="form.video_script" maxlength="1500" rows="4" placeholder="不填则按主题生成默认旁白"></textarea>
          </label>
          <div class="row">
            <label>
              画幅
              <select v-model="form.aspect">
                <option value="9:16">9:16 竖屏</option>
                <option value="16:9">16:9 横屏</option>
                <option value="1:1">1:1 方形</option>
              </select>
            </label>
            <label>
              素材来源
              <select v-model="form.video_source">
                <option value="pexels">Pexels</option>
                <option value="pixabay">Pixabay</option>
                <option value="auto">自动</option>
              </select>
            </label>
          </div>
          <p v-if="genError" class="error">{{ genError }}</p>
          <button class="btn-primary" type="submit" :disabled="submitting || polling">
            {{ submitting || polling ? "生成中..." : "开始生成" }}
          </button>
        </form>

        <div v-if="taskId" class="progress-box">
          <p>任务 ID：<code>{{ taskId }}</code></p>
          <p>状态：{{ statusText }} · 进度 {{ progress }}%</p>
          <div class="bar"><span :style="{ width: progress + '%' }"></span></div>
        </div>

        <div v-if="previewUrl" class="preview-box">
          <video :src="previewUrl" controls playsinline></video>
          <a class="btn-secondary" :href="downloadUrl" download>下载成片</a>
        </div>
      </div>

      <div class="panel">
        <h3>我的 API Key</h3>
        <div class="key-row">
          <code class="api-key">{{ apiKey }}</code>
          <button class="btn-secondary" @click="copyKey">复制</button>
          <button class="btn-danger" @click="rotateKey">重置密钥</button>
        </div>
        <p class="tip">将此 Key 放入请求头 <code>x-api-key</code> 中调用视频生成 API。</p>
      </div>

      <div class="panel">
        <h3>API 调用地址</h3>
        <div class="key-row">
          <code class="api-key">/api/proxy/v1/videos</code>
        </div>
        <p class="tip">
          提交任务：POST /api/proxy/v1/videos · 查询进度：GET /api/proxy/v1/videos/{task_id} ·
          预览：GET /api/proxy/v1/videos/{task_id}/preview ·
          完整文档见 <router-link to="/docs">API 文档</router-link>
        </p>
      </div>

      <div class="panel">
        <h3>调用示例</h3>
        <div class="code-block"><code>
curl -X POST /api/proxy/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: {{ apiKey }}" \
  -d '{"video_subject": "春天适合出发", "aspect": "9:16"}'
        </code></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { api } from "../api/index.js";
import { useAuthStore } from "../store/auth.js";

const auth = useAuthStore();
const token = computed(() => auth.token);
const me = ref(null);
const apiKey = ref(localStorage.getItem("mpt_api_key") || "");
const form = reactive({
  video_subject: "",
  video_script: "",
  aspect: "9:16",
  video_source: "pexels",
});
const genError = ref("");
const submitting = ref(false);
const polling = ref(false);
const taskId = ref("");
const progress = ref(0);
const statusText = ref("");
const previewUrl = ref("");
const downloadUrl = ref("");
let timer = null;

onMounted(async () => {
  if (!token.value) return;
  try {
    const data = await api.me(token.value);
    me.value = data;
    apiKey.value = data.user.api_key;
  } catch {
    auth.logout();
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function rotateKey() {
  if (!confirm("重置后将立即生效，原密钥立即失效，确定继续？")) return;
  const data = await api.rotateKey(token.value);
  apiKey.value = data.api_key;
  localStorage.setItem("mpt_api_key", data.api_key);
  alert("密钥已重置");
}

async function copyKey() {
  await navigator.clipboard.writeText(apiKey.value);
  alert("已复制");
}

async function submitVideo() {
  genError.value = "";
  previewUrl.value = "";
  downloadUrl.value = "";
  progress.value = 0;
  if (!form.video_subject.trim() && !form.video_script.trim()) {
    genError.value = "请填写视频主题或文案";
    return;
  }
  submitting.value = true;
  try {
    const data = await api.createVideo(apiKey.value, {
      video_subject: form.video_subject.trim(),
      video_script: form.video_script.trim(),
      aspect: form.aspect,
      video_source: form.video_source,
    });
    taskId.value = data.task_id;
    statusText.value = data.state || "queued";
    startPoll();
  } catch (e) {
    genError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

function startPoll() {
  polling.value = true;
  if (timer) clearInterval(timer);
  timer = setInterval(pollOnce, 2000);
  pollOnce();
}

async function pollOnce() {
  try {
    const data = await api.videoStatus(apiKey.value, taskId.value);
    progress.value = Number(data.progress || 0);
    statusText.value = data.stage || data.state || "";
    if (data.state === "complete") {
      stopPoll();
      progress.value = 100;
      statusText.value = "完成";
      previewUrl.value = api.videoPreviewUrl(apiKey.value, taskId.value);
      downloadUrl.value = api.videoDownloadUrl(apiKey.value, taskId.value);
      refreshMe();
    } else if (data.state === "failed") {
      stopPoll();
      genError.value = data.error || "生成失败";
    }
  } catch (e) {
    stopPoll();
    genError.value = e.message;
  }
}

function stopPoll() {
  polling.value = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function refreshMe() {
  try {
    me.value = await api.me(token.value);
  } catch {
    /* ignore */
  }
}
</script>

<style scoped>
.console {
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 20px;
}

.console h2 {
  font-size: 28px;
  margin-bottom: 24px;
}

.nologin {
  color: #6b7280;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card span {
  color: #9ca3af;
  font-size: 13px;
}

.stat-card strong {
  font-size: 24px;
  color: #2c3e50;
}

.panel {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.panel h3 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.gen-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gen-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.gen-form textarea,
.gen-form select {
  outline: none;
  border: 1px solid #d9dde3;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  width: 100%;
  font-family: inherit;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn-primary {
  background: #4f6ef7;
  color: #fff;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 14px;
  width: fit-content;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-size: 13px;
}

.progress-box {
  margin-top: 18px;
  font-size: 13px;
  color: #4b5563;
}

.bar {
  margin-top: 8px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: #4f6ef7;
}

.preview-box {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
}

.preview-box video {
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.key-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.api-key {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 10px 14px;
  font-family: "SF Mono", Consolas, monospace;
  font-size: 14px;
  color: #0f172a;
  flex: 1;
  min-width: 280px;
  word-break: break-all;
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
}

.tip {
  color: #6b7280;
  font-size: 13px;
  margin-top: 12px;
}

.code-block {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.code-block code {
  color: #e2e8f0;
  font-size: 13px;
  font-family: "SF Mono", Consolas, monospace;
  line-height: 1.7;
  white-space: pre;
}
</style>
