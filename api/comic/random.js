// api/comic/random.js
// GET /comic/random?count=12
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const count = Math.min(parseInt(req.query.count) || 12, 50);
  const seed = req.query.seed || Date.now();

  try {
    const totalPages = 50;
    const randomPage = Math.floor(Math.abs(Math.sin(seed) * totalPages)) + 1;

    const pages = [
      randomPage,
      Math.max(1, randomPage - 5),
      Math.min(totalPages, randomPage + 5),
    ];

    const fetches = pages.map((p) => fetchHTML(`/komik/page/${p}/`));
    const results = await Promise.allSettled(fetches);

    let allComics = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        allComics.push(...parseComicCards(r.value, ".bge, .bs, .bsx, article.post"));
      }
    });

    const seen = new Set();
    allComics = allComics.filter((c) => {
      if (seen.has(c.slug)) return false;
      seen.add(c.slug); return true;
    });

    for (let i = allComics.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allComics[i], allComics[j]] = [allComics[j], allComics[i]];
    }

    const randomComics = allComics.slice(0, count);

    if (!randomComics.length) {
      return sendError(res, "Tidak ada komik random ditemukan", 404);
    }

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      count: randomComics.length,
      seed,
      results: randomComics,
    }, `Berhasil mengambil ${randomComics.length} komik secara random`);
  } catch (err) {
    return sendError(res, `Gagal mengambil random komik: ${err.message}`, 500);
  }
};
