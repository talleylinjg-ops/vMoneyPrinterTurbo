import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import { mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(path.join(dataDir, "portal.db"));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    quota INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    quota_remaining INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id TEXT,
    endpoint TEXT NOT NULL,
    video_subject TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
});

const defaultPlans = [
  ["免费无限", "完全免费，Pexels / Pixabay 素材，不限次数", 0, 999999, 3650],
];

db.serialize(() => {
  db.run(`UPDATE plans SET is_active = 0 WHERE price > 0`);
  db.run(
    `UPDATE plans SET name = '免费无限', description = '完全免费，Pexels / Pixabay 素材，不限次数', quota = 999999, duration_days = 3650, is_active = 1 WHERE price = 0`
  );
  db.get(`SELECT id FROM plans WHERE price = 0 LIMIT 1`, (err, row) => {
    if (!row) {
      db.run(
        `INSERT INTO plans (name, description, price, quota, duration_days, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
        defaultPlans[0]
      );
    }
  });
  db.run(`UPDATE memberships SET quota_remaining = 999999`);
});

export default db;
