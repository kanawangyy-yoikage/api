// api/comic/comparison.js
// GET /comic/comparison
// Creator: matchadesu_

const { fetchHTML, getTimestamp, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const start = Date.now();

  try {
    const benchmarks = await Promise.allSettled([
      (async () => {
        const t = Date.now();
        await fetchHTML("/");
        return { endpoint: "/", ms: Date.now() - t, status: "ok" };
      })(),
      (async () => {
        const t = Date.now();
        await fetchHTML("/komik/");
        return { endpoint: "/komik/", ms: Date.now() - t, status: "ok" };
      })(),
      (async () => {
        const t = Date.now();
        await fetchHTML("/komik/?orderby=popular");
        return { endpoint: "/komik/?orderby=popular", ms: Date.now() - t, status: "ok" };
      })(),
    ]);

    const results = benchmarks.map((b, i) => {
      if (b.status === "fulfilled") return b.value;
      return { endpoint: ["home", "terbaru", "populer"][i], ms: null, status: "error", error: b.reason?.message };
    });

    const successResults = results.filter((r) => r.ms !== null);
    const avgMs = successResults.length
      ? Math.round(successResults.reduce((s, r) => s + r.ms, 0) / successResults.length)
      : null;

    const totalMs = Date.now() - start;

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      totalTimeMs: totalMs,
      averageMs: avgMs,
      benchmarks: results,
      performance: {
        rating: avgMs < 1000 ? "Excellent ⚡" : avgMs < 2000 ? "Good ✅" : avgMs < 4000 ? "Average ⚠️" : "Slow 🐢",
        avgMs,
        source: BASE_URL,
      },
      comparison: {
        "API This": { avgMs, note: "Scraper real-time" },
        "Cached API": { avgMs: null, note: "Tidak tersedia (no cache)" },
      },
    }, "Performance comparison selesai");
  } catch (err) {
    return sendError(res, `Gagal benchmark: ${err.message}`, 500);
  }
};
