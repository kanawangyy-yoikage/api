// api/comic/search.js
// GET /comic/search?q=naruto&page=1
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = req.query.q || req.query.keyword || req.query.s || "";
  const page = parseInt(req.query.page) || 1;

  if (!q.trim()) return sendError(res, "Parameter ?q= tidak boleh kosong", 400);

  const encoded = encodeURIComponent(q.trim());
  const path = page > 1
    ? `/page/${page}/?s=${encoded}`
    : `/?s=${encoded}`;

  try {
    const $ = await fetchHTML(path);
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post, .search-result .item");
    const pagination = parsePagination($);

    const noResult = $(".not-found, .no-results, .noresult, .entry-content p").first().text().toLowerCase();
    if (!comics.length && (noResult.includes("not found") || noResult.includes("ditemukan"))) {
      return sendError(res, `Tidak ada hasil untuk: "${q}"`, 404);
    }

    return sendSuccess(res, {
      keyword: q,
      page, pagination,
      total: comics.length,
      results: comics,
    }, comics.length
      ? `Ditemukan ${comics.length} komik untuk: "${q}"`
      : `Tidak ada komik untuk: "${q}"`
    );
  } catch (err) {
    return sendError(res, `Gagal mencari: ${err.message}`, 500);
  }
};
