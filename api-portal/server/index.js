import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import gateway from "./gateway.js";
import { PORT } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use("/api/proxy", gateway);
app.use(
  express.static(path.join(__dirname, "../web/dist"), {
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "服务器内部错误" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Portal server listening on http://0.0.0.0:${PORT}`);
});
