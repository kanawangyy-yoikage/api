// api/comic/realtime.js
// GET /comic/realtime
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const start = Date.now();

  try {
    const $ = await fetchHTML("/");

    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");

    const recentUpdates = comics
      .filter((c) => c.latestChapter || c.updatedAt)
      .slice(0, 20);

    const chapterUpdates = [];
    $(".bge, .bs").each((_, el) => {
      const title = $(el).find("h3 a, h2 a").first().text().trim();
      const chLink = $(el).find(".lch a, .chapter a").first();
      const ch = chLink.text().trim();
      const chUrl = chLink.attr("href") || "";
      const date = $(el).find(".date, time").first().text().trim();
      if (title && ch) {
        chapterUpdates.push({
          title,
          latestChapter: ch,
          chapterUrl: chUrl,
          lastUpdated: date || null,
        });
      }
    });

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: Date.now() - start,
      isRealtime: true,
      scrapedAt: new Date().toISOString(),
      total: comics.length,
      recentUpdates: recentUpdates.length ? recentUpdates : comics.slice(0, 20),
      chapterUpdates: chapterUpdates.slice(0, 20),
    }, `Real-time data: ${comics.length} komik terbaru berhasil diambil`);
  } catch (err) {
    return sendError(res, `Gagal mengambil realtime data: ${err.message}`, 500);
  }
};
