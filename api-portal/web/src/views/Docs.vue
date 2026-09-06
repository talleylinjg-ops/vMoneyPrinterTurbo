<template>
  <div class="docs">
    <h2>API 接口文档</h2>
    <p class="sub">使用您的 API Key 调用视频生成服务</p>

    <div class="doc-section">
      <h3>1. 认证方式</h3>
      <p>所有请求需在请求头携带您的 API Key：</p>
      <div class="code-block"><code>x-api-key: mpt_你的密钥</code></div>
    </div>

    <div class="doc-section">
      <h3>2. 提交视频生成任务</h3>
      <div class="code-block"><code>
POST /api/proxy/v1/videos

{
   "video_subject": "自然风景短视频",
   "video_source": "pexels",
  "video_aspect": "9:16",
  "video_concat_mode": "random",
  "video_clip_duration": 3,
  "video_count": 1
}
      </code></div>
      <p>返回：</p>
      <div class="code-block"><code>
{ "status": 200, "data": { "task_id": "xxxxx" } }
      </code></div>
    </div>

    <div class="doc-section">
      <h3>3. 查询任务进度</h3>
      <div class="code-block"><code>
GET /api/proxy/v1/tasks/{task_id}
      </code></div>
      <p>当 <code>state</code> 为 <code>1</code> 表示完成，<code>videos</code> 数组中包含视频下载地址。</p>
    </div>

    <div class="doc-section">
      <h3>4. 完整调用示例</h3>
      <div class="code-block"><code>
curl -X POST https://YOUR_DOMAIN/api/proxy/v1/videos \
  -H "Content-Type: application/json" \
  -H "x-api-key: mpt_你的密钥" \
   -d '{"video_subject": "自然风景短视频", "video_source": "pexels"}'

curl https://YOUR_DOMAIN/api/proxy/v1/tasks/TASK_ID \
  -H "x-api-key: mpt_你的密钥"
      </code></div>
    </div>

    <div class="doc-section">
      <h3>5. 常用参数</h3>
      <table>
        <thead>
          <tr><th>参数</th><th>说明</th><th>示例</th></tr>
        </thead>
        <tbody>
          <tr><td>video_subject</td><td>视频主题</td><td>"自然风景短视频"</td></tr>
          <tr><td>video_source</td><td>素材来源</td><td>"pexels" 或 "pixabay"</td></tr>
          <tr><td>video_aspect</td><td>视频比例</td><td>"9:16" 或 "16:9"</td></tr>
          <tr><td>video_script</td><td>直接指定文案（可选）</td><td>省略则按主题生成本地文案</td></tr>
          <tr><td>voice_name</td><td>配音音色</td><td>留空用默认</td></tr>
          <tr><td>video_clip_duration</td><td>单片段时长（秒）</td><td>3</td></tr>
          <tr><td>video_count</td><td>生成数量</td><td>1</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

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
</style>
