#!/usr/bin/env node
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const manifestPath = join(root, "cloudflare", "static-manifest.json");
const staticDir = join(root, "static");
const BUCKET = process.env.R2_BUCKET || "moneyprinterturbo-static";
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "2e33f078edc00ade4b25e61526d6f544";

function wrangler(args) {
  const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
  const r = spawnSync("npx", ["wrangler", ...args], {
    cwd: join(root, "cloudflare"),
    env,
    encoding: "utf8",
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r;
}

function combinedText(r) {
  return `${r.stdout || ""}${r.stderr || ""}`;
}

function wranglerRetry(args, { attempts = 4, delayMs = 2000 } = {}) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    last = wrangler(args);
    if (last.status === 0) return last;
    const text = combinedText(last);
    const retryable = /fetch failed|connectivity|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(text);
    if (!retryable || i === attempts) return last;
    const wait = delayMs * i;
    console.error(`retry ${i}/${attempts - 1} after ${wait}ms: ${args.join(" ")}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
  }
  return last;
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const ensure = wrangler(["r2", "bucket", "create", BUCKET]);
const combined = combinedText(ensure);
if (ensure.status !== 0 && !/already exists|10004/i.test(combined)) {
  console.error("R2 bucket create failed. Set a valid CLOUDFLARE_API_TOKEN and retry.");
  process.exit(ensure.status || 1);
}

let ok = 0;
for (const file of manifest.files) {
  const local = join(staticDir, file.key);
  const put = wranglerRetry([
    "r2",
    "object",
    "put",
    `${BUCKET}/${file.key}`,
    "--file",
    local,
    "--content-type",
    file.contentType,
    "--remote",
  ]);
  if (put.status !== 0) {
    console.error(`put failed: ${file.key}`);
    process.exit(put.status || 1);
  }
  ok += 1;
  console.log(`uploaded ${file.key} sha256=${file.sha256}`);
}

console.log(`sync-r2: ${ok}/${manifest.files.length} uploaded to ${BUCKET}, checksums recorded in static-manifest.json`);
