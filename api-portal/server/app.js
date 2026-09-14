import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "./db.js";
import { JWT_SECRET } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "未登录" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "登录已过期，请重新登录" });
  }
}

function generateApiKey() {
  return "mpt_" + crypto.randomBytes(24).toString("hex");
}

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

app.post("/api/auth/register", async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ message: "请填写完整信息" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "密码至少 6 位" });
  }
  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (exists) return res.status(400).json({ message: "该邮箱已注册" });

  const hash = await bcrypt.hash(password, 10);
  const apiKey = generateApiKey();
  const { lastID } = await run(
    "INSERT INTO users (email, username, password_hash, api_key) VALUES (?, ?, ?, ?)",
    [email, username, hash, apiKey]
  );

  const freePlan = await queryOne("SELECT * FROM plans WHERE price = 0 AND is_active = 1");
  if (freePlan) {
    const expires = new Date(Date.now() + freePlan.duration_days * 86400000).toISOString();
    await run(
      "INSERT INTO memberships (user_id, plan_id, quota_remaining, expires_at) VALUES (?, ?, ?, ?)",
      [lastID, freePlan.id, freePlan.quota, expires]
    );
  }

  const token = jwt.sign({ id: lastID, email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, api_key: apiKey, user: { id: lastID, email, username } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "邮箱或密码错误" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, api_key: user.api_key, user: { id: user.id, email: user.email, username: user.username } });
});

app.get("/api/user/me", auth, async (req, res) => {
  const user = await queryOne("SELECT id, email, username, api_key, balance, created_at FROM users WHERE id = ?", [req.user.id]);
  const membership = await queryOne(
    `SELECT m.*, p.name as plan_name, p.quota as plan_quota, p.description as plan_description
     FROM memberships m JOIN plans p ON m.plan_id = p.id
     WHERE m.user_id = ? ORDER BY m.id DESC LIMIT 1`,
    [req.user.id]
  );
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = await queryOne(
    "SELECT COUNT(*) as cnt FROM usage_logs WHERE user_id = ? AND status = 'success' AND date(created_at) = ?",
    [req.user.id, today]
  );
  const totalUsed = await queryOne(
    "SELECT COUNT(*) as cnt FROM usage_logs WHERE user_id = ? AND status = 'success'",
    [req.user.id]
  );
  res.json({ user, membership, today_usage: usedToday?.cnt || 0, total_usage: totalUsed?.cnt || 0 });
});

app.post("/api/user/rotate-key", auth, async (req, res) => {
  const apiKey = generateApiKey();
  await run("UPDATE users SET api_key = ? WHERE id = ?", [apiKey, req.user.id]);
  res.json({ api_key: apiKey });
});

app.get("/api/plans", async (req, res) => {
  const plans = await query("SELECT * FROM plans WHERE is_active = 1 ORDER BY price");
  res.json({ plans });
});

app.post("/api/orders", auth, async (req, res) => {
  const { plan_id, simulate } = req.body;
  const plan = await queryOne("SELECT * FROM plans WHERE id = ? AND is_active = 1", [plan_id]);
  if (!plan) return res.status(404).json({ message: "套餐不存在" });

  if (simulate) {
    const expires = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
    await run(
      "INSERT INTO memberships (user_id, plan_id, quota_remaining, expires_at) VALUES (?, ?, ?, ?)",
      [req.user.id, plan.id, plan.quota, expires]
    );
    return res.json({ success: true, message: `已开通「${plan.name}」套餐` });
  }

  const orderNo = "MPT" + Date.now() + Math.floor(Math.random() * 1000);
  const { lastID } = await run(
    "INSERT INTO orders (order_no, user_id, plan_id, amount) VALUES (?, ?, ?, ?)",
    [orderNo, req.user.id, plan.id, plan.price]
  );
  res.json({ order_id: lastID, order_no: orderNo, amount: plan.price, status: "pending" });
});

app.post("/api/orders/:id/pay", auth, async (req, res) => {
  const order = await queryOne("SELECT * FROM orders WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  if (!order) return res.status(404).json({ message: "订单不存在" });
  if (order.status === "paid") return res.json({ success: true, message: "订单已支付" });

  const plan = await queryOne("SELECT * FROM plans WHERE id = ?", [order.plan_id]);
  await run("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?", [order.id]);
  const expires = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
  await run(
    "INSERT INTO memberships (user_id, plan_id, quota_remaining, expires_at) VALUES (?, ?, ?, ?)",
    [order.user_id, plan.id, plan.quota, expires]
  );
  res.json({ success: true, message: `支付成功，已开通「${plan.name}」套餐` });
});

app.get("/api/user/orders", auth, async (req, res) => {
  const orders = await query(
    `SELECT o.*, p.name as plan_name FROM orders o JOIN plans p ON o.plan_id = p.id WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ orders });
});

app.get("/api/user/usage", auth, async (req, res) => {
  const logs = await query(
    "SELECT * FROM usage_logs WHERE user_id = ? ORDER BY id DESC LIMIT 100",
    [req.user.id]
  );
  res.json({ logs });
});

app.put("/api/user/profile", auth, async (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ message: "用户名不能为空" });
  }
  const name = username.trim();
  if (name.length > 30) {
    return res.status(400).json({ message: "用户名最长 30 个字符" });
  }
  await run("UPDATE users SET username = ? WHERE id = ?", [name, req.user.id]);
  res.json({ success: true, username: name });
});

app.put("/api/user/password", auth, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ message: "请填写完整信息" });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: "新密码至少 6 位" });
  }
  const user = await queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]);
  if (!(await bcrypt.compare(old_password, user.password_hash))) {
    return res.status(400).json({ message: "原密码错误" });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
  res.json({ success: true, message: "密码修改成功" });
});

export { app, auth, query, queryOne, run };
