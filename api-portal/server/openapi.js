export function saasSpec(origin) {
  const base = origin.replace(/\/$/, "");
  return {
    openapi: "3.0.3",
    info: {
      title: "MPT 短视频生成 API",
      version: "1.3.7",
      description:
        "注册后用 x-api-key 提交主题，异步生成带配音和字幕的短视频。素材 Pexels/Pixabay，配音 Edge TTS，不调用大模型。全新生成流水线，不支持时间轴精修已有视频。",
    },
    servers: [{ url: base, description: "当前门户" }],
    security: [{ apiKey: [] }],
    tags: [{ name: "videos", description: "视频生成" }],
    paths: {
      "/api/proxy/v1/videos": {
        post: {
          tags: ["videos"],
          summary: "提交生成任务",
          operationId: "createVideo",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateVideo" },
                example: {
                  video_subject: "春天适合出发",
                  aspect: "9:16",
                  video_source: "pexels",
                },
              },
            },
          },
          responses: {
            200: {
              description: "已入队",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateResult" },
                },
              },
            },
            400: { description: "缺少主题或文案" },
            401: { description: "缺少或无效 API Key" },
          },
        },
        get: {
          tags: ["videos"],
          summary: "列出最近任务",
          operationId: "listVideos",
          responses: { 200: { description: "任务列表" } },
        },
      },
      "/api/proxy/v1/videos/{task_id}": {
        get: {
          tags: ["videos"],
          summary: "查询任务进度",
          operationId: "getVideo",
          parameters: [
            {
              name: "task_id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "任务状态",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Task" },
                },
              },
            },
            404: { description: "任务不存在" },
          },
        },
      },
      "/api/proxy/v1/videos/{task_id}/preview": {
        get: {
          tags: ["videos"],
          summary: "预览成片 MP4",
          operationId: "previewVideo",
          parameters: [
            { name: "task_id", in: "path", required: true, schema: { type: "string" } },
            { name: "api_key", in: "query", schema: { type: "string" }, description: "浏览器播放可用 query" },
          ],
          responses: { 200: { description: "video/mp4" } },
        },
      },
      "/api/proxy/v1/videos/{task_id}/download": {
        get: {
          tags: ["videos"],
          summary: "下载成片 MP4",
          operationId: "downloadVideo",
          parameters: [
            { name: "task_id", in: "path", required: true, schema: { type: "string" } },
            { name: "api_key", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "video/mp4 attachment" } },
        },
      },
      "/api/proxy/v1/options": {
        get: {
          tags: ["videos"],
          summary: "音色、画幅、上限",
          operationId: "getOptions",
          responses: { 200: { description: "可用选项" } },
        },
      },
    },
    components: {
      securitySchemes: {
        apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      },
      schemas: {
        CreateVideo: {
          type: "object",
          properties: {
            video_subject: { type: "string", description: "视频主题" },
            video_script: { type: "string", description: "旁白，最多 1500 字" },
            video_terms: { type: "string", description: "英文关键词，逗号分隔" },
            language: { type: "string", default: "zh-CN" },
            video_source: { type: "string", enum: ["pexels", "pixabay", "auto"], default: "pexels" },
            aspect: { type: "string", enum: ["9:16", "16:9", "1:1"], default: "9:16" },
            voice_name: { type: "string", default: "zh-CN-XiaoxiaoNeural" },
            subtitle_enabled: { type: "boolean", default: true },
            clip_duration: { type: "number", default: 3 },
          },
        },
        CreateResult: {
          type: "object",
          properties: {
            task_id: { type: "string" },
            state: { type: "string", example: "queued" },
          },
        },
        Task: {
          type: "object",
          properties: {
            task_id: { type: "string" },
            state: { type: "string", enum: ["queued", "processing", "complete", "failed"] },
            progress: { type: "number" },
            stage: { type: "string" },
            error: { type: "string" },
            script: { type: "string" },
            duration: { type: "number" },
            file_size: { type: "number" },
          },
        },
      },
    },
  };
}
