const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_SIZE_MB = 100;
const DEFAULT_DOWNLOAD_SIZE_MB = 25;
const CHUNK_SIZE = 64 * 1024;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.raw({ type: "application/octet-stream", limit: `${MAX_SIZE_MB}mb` }));
app.use(express.static(path.join(__dirname, "../public")));

function noCache(req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

function getDownloadSizeMb(value) {
  const requestedSize = Number(value);

  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    return DEFAULT_DOWNLOAD_SIZE_MB;
  }

  return Math.min(requestedSize, MAX_SIZE_MB);
}

app.use("/api", noCache);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Speed test backend is running",
    time: Date.now()
  });
});

app.get("/api/ping", (req, res) => {
  res.json({
    ok: true,
    time: Date.now()
  });
});

app.get("/api/download", (req, res) => {
  const sizeMb = getDownloadSizeMb(req.query.size);
  const bytes = Math.floor(sizeMb * 1024 * 1024);
  const chunk = Buffer.alloc(CHUNK_SIZE);
  let sent = 0;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", bytes);

  function sendChunk() {
    while (sent < bytes) {
      const remaining = bytes - sent;
      const data = remaining >= chunk.length ? chunk : chunk.subarray(0, remaining);
      sent += data.length;

      if (!res.write(data)) {
        res.once("drain", sendChunk);
        return;
      }
    }

    res.end();
  }

  sendChunk();
});

app.post("/api/upload", (req, res) => {
  const receivedBytes = Buffer.isBuffer(req.body) ? req.body.length : 0;
  const receivedMB = receivedBytes / 1024 / 1024;

  res.json({
    ok: true,
    receivedBytes,
    receivedMB: Number(receivedMB.toFixed(4)),
    time: Date.now()
  });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    res.status(413).json({
      ok: false,
      error: `Upload too large. Maximum upload size is ${MAX_SIZE_MB} MB.`
    });
    return;
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`NetPulse Speed Test running at http://localhost:${PORT}`);
});
