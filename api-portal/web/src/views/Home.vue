<template>
  <div class="home">
    <section class="hero">
      <div class="hero-inner">
        <h1>免费短视频生成 API</h1>
        <p class="subtitle">
          输入主题即可用 Pexels / Pixabay 免费素材自动匹配画面，并合成配音与字幕。
          全程无需大模型，完全免费运营。
        </p>
        <div class="hero-actions">
          <router-link v-if="!loggedIn" to="/register" class="btn-primary btn-lg">立即免费注册</router-link>
          <router-link v-else to="/console" class="btn-primary btn-lg">进入控制台</router-link>
          <router-link to="/docs" class="btn-outline btn-lg">查看 API 文档</router-link>
        </div>
        <div class="hero-stats">
          <div class="stat"><strong>0 元</strong><span>完全免费不限次数</span></div>
          <div class="stat"><strong>2 库</strong><span>Pexels + Pixabay</span></div>
          <div class="stat"><strong>9:16</strong><span>竖屏横屏全支持</span></div>
        </div>
      </div>
    </section>

    <section class="features">
      <h2>核心能力</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <h3>主题即文案</h3>
          <p>提供视频主题即可生成本地旁白文案和检索关键词，无需接入任何大模型。</p>
        </div>
        <div class="feature-card">
          <h3>免费素材匹配</h3>
          <p>仅使用 Pexels / Pixabay 免费素材库检索高清视频片段，失败时自动切换另一库。</p>
        </div>
        <div class="feature-card">
          <h3>免费配音 + 字幕</h3>
          <p>使用 Edge TTS 免费配音，并自动生成字幕，一键合成成片。</p>
        </div>
        <div class="feature-card">
          <h3>异步任务队列</h3>
          <p>任务提交后立即返回 TaskID，通过轮询接口获取进度，适合批量生产。</p>
        </div>
      </div>
    </section>

    <section class="quick-start">
      <h2>快速开始</h2>
      <div class="code-block">
        <code>
# 1. 注册账号获取 API Key
# 2. 提交视频生成任务
curl -X POST https://{你的域名}/api/proxy/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: mpt_你的密钥" \
   -d '{"video_subject": "自然风景短视频", "video_source": "pexels"}'
# 3. 轮询任务进度
curl https://{你的域名}/api/proxy/v1/tasks/{task_id} \
  -H "x-api-key: mpt_你的密钥"
        </code>
      </div>
      <router-link v-if="!loggedIn" to="/register" class="btn-primary">免费开始体验</router-link>
      <router-link v-else to="/console" class="btn-primary">进入控制台</router-link>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, #4f6ef7 0%, #7b5cf0 100%);
  color: #fff;
  padding: 80px 20px 60px;
  text-align: center;
}

.hero-inner {
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 40px;
  margin-bottom: 20px;
}

.subtitle {
  font-size: 17px;
  line-height: 1.7;
  opacity: 0.92;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;
}

.btn-primary {
  background: #fff;
  color: #4f6ef7 !important;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-outline {
  border: 1px solid rgba(255, 255, 255, 0.7);
  color: #fff !important;
  padding: 12px 28px;
  border-radius: 8px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat strong {
  font-size: 28px;
}

.stat span {
  font-size: 13px;
  opacity: 0.85;
}

.features {
  max-width: 1200px;
  margin: 0 auto;
  padding: 64px 20px;
  text-align: center;
}

.features h2 {
  font-size: 28px;
  margin-bottom: 40px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: left;
}

.feature-card h3 {
  margin-bottom: 12px;
  color: #2c3e50;
}

.feature-card p {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}

.quick-start {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px 64px;
  text-align: center;
}

.quick-start h2 {
  font-size: 28px;
  margin-bottom: 24px;
}

.code-block {
  background: #1e293b;
  border-radius: 10px;
  padding: 24px;
  text-align: left;
  margin-bottom: 28px;
  overflow-x: auto;
}

.code-block code {
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.8;
  font-family: "SF Mono", Consolas, monospace;
  white-space: pre;
}

.btn-primary {
  display: inline-block;
  background: #4f6ef7;
  color: #fff !important;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 600;
}
</style>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../store/auth.js";

const auth = useAuthStore();
const loggedIn = computed(() => !!auth.token);
</script>
