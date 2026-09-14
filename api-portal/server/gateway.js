import { Router } from "express";
import db from "./db.js";
import { MPT_API_BASE, MPT_API_KEY } from "./config.js";

const router = Router();

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

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

async function verifyApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
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

async function proxyToMPT(req, res, targetPath) {
  const isSubmit = req.method === "POST";
  if (isSubmit) {
    const source =
      req.body.video_source === "pixabay" ? "pixabay" : "pexels";
    const body = {
      ...req.body,
      video_subject: req.body.video_subject || "自然风景短视频",
      video_source: source,
    };
    try {
      const mptRes = await fetch(`${MPT_API_BASE}${targetPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": MPT_API_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await mptRes.json();

      if (mptRes.ok && data.status === 200 && data.data?.task_id) {
        await run(
          "INSERT INTO usage_logs (user_id, task_id, endpoint, video_subject, status) VALUES (?, ?, ?, ?, ?)",
          [req.user.id, data.data.task_id, targetPath, body.video_subject, "success"]
        );
      } else {
        await run(
          "INSERT INTO usage_logs (user_id, endpoint, video_subject, status) VALUES (?, ?, ?, ?)",
          [req.user.id, targetPath, body.video_subject, "failed"]
        );
      }
      return res.status(mptRes.status).json(data);
    } catch (e) {
      await run(
        "INSERT INTO usage_logs (user_id, endpoint, video_subject, status) VALUES (?, ?, ?, ?)",
        [req.user.id, targetPath, req.body.video_subject, "error"]
      );
      return res.status(502).json({ status: 502, message: "视频服务暂不可用，请稍后重试" });
    }
  }

  const mptRes = await fetch(`${MPT_API_BASE}${targetPath}`, {
    headers: { "x-api-key": MPT_API_KEY },
  });
  const data = await mptRes.json();
  return res.status(mptRes.status).json(data);
}

router.post("/v1/videos", verifyApiKey, (req, res) => proxyToMPT(req, res, "/api/v1/videos"));
router.post("/v1/subtitle", verifyApiKey, (req, res) => proxyToMPT(req, res, "/api/v1/subtitle"));
router.post("/v1/audio", verifyApiKey, (req, res) => proxyToMPT(req, res, "/api/v1/audio"));
router.get("/v1/tasks/:taskId", verifyApiKey, (req, res) =>
  proxyToMPT(req, res, `/api/v1/tasks/${req.params.taskId}`)
);
router.get("/v1/tasks", verifyApiKey, (req, res) => proxyToMPT(req, res, "/api/v1/tasks"));

export default router;
