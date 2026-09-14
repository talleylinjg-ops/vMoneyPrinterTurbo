# Cloudflare Worker 部署

Worker 在边缘提供静态前台，并把 `/api/*`、`/docs*`、`/health` 反向代理到自建后端。

## 配置

编辑 `wrangler.toml` 中的 `BACKEND_ORIGIN`，指向你的 Python 后端，例如：

```toml
[vars]
BACKEND_ORIGIN = "https://your-backend.example.com"
```

## 本地调试

```bash
cd cloudflare
npm install
npx wrangler dev
```

## 部署

```bash
cd cloudflare
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=xxx npx wrangler deploy
```

部署后 Worker 会给出 `https://moneyprinterturbo.<account>.workers.dev` 地址。
