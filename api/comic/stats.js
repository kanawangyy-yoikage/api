// api/comic/stats.js
// GET /comic/stats
// Creator: matchadesu_

const { fetchHTML, getTimestamp, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const startTime = Date.now();

  try {
    const $ = await fetchHTML("/");
    const elapsed = Date.now() - startTime;

    let totalComics = 0, totalChapters = 0, totalViews = 0;

    $(".stat-item, .counter, .site-stat").each((_, el) => {
      const label = $(el).find(".label, .stat-label, p").text().toLowerCase();
      const value = parseInt($(el).find(".value, .count, strong").text().replace(/[^0-9]/g, "")) || 0;
      if (label.includes("komik") || label.includes("manga")) totalComics = value;
      if (label.includes("chapter")) totalChapters = value;
      if (label.includes("view") || label.includes("baca")) totalViews = value;
    });

    if (!totalComics) {
      totalComics = $(".bge, .bs, .bsx, article.post").length * 100;
    }

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: elapsed,
      source: BASE_URL,
      stats: {
        totalComics: totalComics || "N/A",
        totalChapters: totalChapters || "N/A",
        totalViews: totalViews || "N/A",
        estimatedComics: totalComics || "Lebih dari 10.000",
      },
      api: {
        totalEndpoints: 28,
        version: "1.0.0",
        creator: "matchadesu_",
        uptime: process.uptime().toFixed(2) + "s",
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      },
    }, "Statistik API Komiku berhasil diambil");
  } catch (err) {
    return sendError(res, `Gagal mengambil statistik: ${err.message}`, 500);
  }
};
