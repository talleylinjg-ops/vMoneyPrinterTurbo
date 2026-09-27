import { Router } from "express";
import { Readable } from "stream";
import db from "./db.js";
import { MPT_API_BASE, MPT_API_KEY } from "./config.js";

const router = Router();

const queryOne = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

function engineHeaders(json = false) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  if (MPT_API_KEY) headers["x-api-key"] = MPT_API_KEY;
  return headers;
}

function toEngineBody(body = {}) {
  const source = ["pixabay", "auto", "pexels"].includes(body.video_source)
    ? body.video_source
    : "pexels";
  return {
    video_subject: String(body.video_subject || "").trim(),
    video_script: String(body.video_script || "").trim(),
    video_terms: body.video_terms || "",
    language: body.language || "zh-CN",
    video_source: source,
    aspect: body.aspect || body.video_aspect || "9:16",
    concat_mode: body.concat_mode || body.video_concat_mode || "random",
    clip_duration: Number(body.clip_duration || body.video_clip_duration || 3),
    video_count: 1,
    voice_name: body.voice_name || "zh-CN-XiaoxiaoNeural",
    subtitle_enabled: body.subtitle_enabled !== false,
  };
}

async function verifyApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  if (!apiKey) {
    return res.status(401).json({ status: 401, message: "缺少 x-api-key 请求头" });
  }
  const user = await queryOne("SELECT * FROM users WHERE api_key = ?", [apiKey]);
  if (!user) {
    return res.status(401).json({ status: 401, message: "API Key 无效" });
  }

  const membership = await queryOne(
    `SELECT m.*, p.name as plan_name, p.quota as plan_quota
     FROM memberships m JOIN plans p ON m.plan_id = p.id
     WHERE m.user_id = ? ORDER BY m.id DESC LIMIT 1`,
    [user.id]
  );

  if (!membership) {
    return res.status(403).json({ status: 403, message: "账号未开通，请重新注册" });
  }

  req.user = user;
  req.membership = membership;
  next();
}

async function logUsage(userId, taskId, endpoint, subject, status) {
  await run(
    "INSERT INTO usage_logs (user_id, task_id, endpoint, video_subject, status) VALUES (?, ?, ?, ?, ?)",
    [userId, taskId || null, endpoint, subject || "", status]
  );
}

async function proxyJson(req, res, targetPath, { method = "GET", body } = {}) {
  try {
    const mptRes = await fetch(`${MPT_API_BASE}${targetPath}`, {
      method,
      headers: engineHeaders(Boolean(body)),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await mptRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || "视频服务返回异常" };
    }
    return res.status(mptRes.status).json(data);
  } catch {
    return res.status(502).json({ status: 502, message: "视频服务暂不可用，请稍后重试" });
  }
}

async function proxyBinary(req, res, targetPath) {
  try {
    const mptRes = await fetch(`${MPT_API_BASE}${targetPath}`, {
      headers: engineHeaders(),
    });
    res.status(mptRes.status);
    const contentType = mptRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const cd = mptRes.headers.get("content-disposition");
    if (cd) res.setHeader("Content-Disposition", cd);
    const acceptRanges = mptRes.headers.get("accept-ranges");
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    if (!mptRes.body) {
      const buf = Buffer.from(await mptRes.arrayBuffer());
      return res.send(buf);
    }
    Readable.fromWeb(mptRes.body).pipe(res);
  } catch {
    if (!res.headersSent) {
      res.status(502).json({ status: 502, message: "视频服务暂不可用，请稍后重试" });
    }
  }
}

router.post("/v1/videos", verifyApiKey, async (req, res) => {
  const body = toEngineBody(req.body || {});
  if (!body.video_subject && !body.video_script) {
    return res.status(400).json({ status: 400, message: "请填写视频主题或视频文案" });
  }
  try {
    const mptRes = await fetch(`${MPT_API_BASE}/api/v1/videos`, {
      method: "POST",
      headers: engineHeaders(true),
      body: JSON.stringify(body),
    });
    const data = await mptRes.json().catch(() => ({}));
    const taskId = data.task_id || data.data?.task_id;
    if (mptRes.ok && taskId) {
      await logUsage(req.user.id, taskId, "/api/v1/videos", body.video_subject, "success");
    } else {
      await logUsage(req.user.id, null, "/api/v1/videos", body.video_subject, "failed");
    }
    return res.status(mptRes.status).json(data);
  } catch {
    await logUsage(req.user.id, null, "/api/v1/videos", body.video_subject, "error");
    return res.status(502).json({ status: 502, message: "视频服务暂不可用，请稍后重试" });
  }
});

router.get("/v1/videos/:taskId/preview", verifyApiKey, (req, res) =>
  proxyBinary(req, res, `/api/v1/videos/${req.params.taskId}/preview`)
);
router.get("/v1/videos/:taskId/download", verifyApiKey, (req, res) =>
  proxyBinary(req, res, `/api/v1/videos/${req.params.taskId}/download`)
);
router.get("/v1/videos/:taskId/file", verifyApiKey, (req, res) =>
  proxyBinary(req, res, `/api/v1/videos/${req.params.taskId}/file`)
);
router.get("/v1/videos/:taskId", verifyApiKey, (req, res) =>
  proxyJson(req, res, `/api/v1/videos/${req.params.taskId}`)
);
router.get("/v1/videos", verifyApiKey, (req, res) => proxyJson(req, res, "/api/v1/videos"));
router.get("/v1/options", verifyApiKey, (req, res) => proxyJson(req, res, "/api/v1/options"));
router.get("/v1/tasks/:taskId", verifyApiKey, (req, res) =>
  proxyJson(req, res, `/api/v1/videos/${req.params.taskId}`)
);
router.get("/v1/tasks", verifyApiKey, (req, res) => proxyJson(req, res, "/api/v1/videos"));

export default router;
