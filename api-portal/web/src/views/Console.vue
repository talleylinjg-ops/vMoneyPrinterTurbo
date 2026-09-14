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
          <span>本月已用</span>
          <strong>{{ me.today_usage }} 次</strong>
        </div>
        <div class="stat-card">
          <span>累计使用</span>
          <strong>{{ me.total_usage }} 次</strong>
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
          提交任务：POST /api/proxy/v1/videos · 查询进度：GET /api/proxy/v1/tasks/{task_id} ·
          完整文档见 <router-link to="/docs">API 文档</router-link>
        </p>
      </div>

      <div class="panel">
        <h3>调用示例</h3>
        <div class="code-block"><code>
curl -X POST /api/proxy/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: {{ apiKey }}" \
   -d '{"video_subject": "自然风景短视频", "video_source": "pexels"}'
        </code></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api } from "../api/index.js";
import { useAuthStore } from "../store/auth.js";

const auth = useAuthStore();
const token = computed(() => auth.token);
const me = ref(null);
const apiKey = ref(localStorage.getItem("mpt_api_key") || "");

onMounted(async () => {
  if (!token.value) return;
  try {
    const data = await api.me(token.value);
    me.value = data;
    apiKey.value = data.user.api_key;
  } catch (e) {
    auth.logout();
  }
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
