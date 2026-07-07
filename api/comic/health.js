// api/comic/health.js
// GET /comic/health
// Creator: matchadesu_

const { fetchHTML, getTimestamp, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const start = Date.now();
  const checks = {};

  try {
    const t = Date.now();
    const $ = await fetchHTML("/");
    checks.komiku = {
      status: "up",
      responseMs: Date.now() - t,
      hasContent: $("body").length > 0,
    };
  } catch (e) {
    checks.komiku = { status: "down", error: e.message };
  }

  try {
    const t = Date.now();
    await fetchHTML("/");
    checks.thumbnail = {
      status: "up",
      responseMs: Date.now() - t,
    };
  } catch (e) {
    checks.thumbnail = { status: "down", error: e.message };
  }

  const mem = process.memoryUsage();
  checks.memory = {
    status: "ok",
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
    rssMemoryMB: (mem.rss / 1024 / 1024).toFixed(2),
  };

  const allUp = Object.values(checks).every((c) => c.status === "up" || c.status === "ok");
  const elapsed = Date.now() - start;

  const payload = {
    status: allUp ? "healthy" : "degraded",
    timestamp: getTimestamp(),
    responseTimeMs: elapsed,
    uptime: process.uptime().toFixed(2) + "s",
    node: process.version,
    platform: process.platform,
    checks,
  };

  if (allUp) {
    return sendSuccess(res, payload, "Semua sistem berjalan normal ✅");
  } else {
    return res.status(503).json({
      status: "failed",
      creator: "matchadesu_",
      statusCode: 503,
      statusMessage: "Service Unavailable",
      message: "Beberapa layanan mengalami gangguan ⚠️",
      ok: false,
      data: payload,
    });
  }
};
