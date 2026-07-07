// api/comic/trending.js
// GET /comic/trending?page=1&period=weekly
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const page = parseInt(req.query.page) || 1;
  const period = req.query.period || "weekly";

  const orderMap = { daily: "popular", weekly: "popular", monthly: "popular" };
  const order = orderMap[period] || "popular";

  const paths = [
    page > 1 ? `/trending/page/${page}/` : `/trending/`,
    page > 1 ? `/komik/page/${page}/?orderby=${order}` : `/komik/?orderby=${order}`,
  ];

  let $, comics, pagination;

  for (const p of paths) {
    try {
      $ = await fetchHTML(p);
      comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
      if (comics.length) { pagination = parsePagination($); break; }
    } catch { /* lanjut */ }
  }

  if (!comics?.length) {
    return sendError(res, "Tidak ada trending komik ditemukan", 404);
  }

  const ranked = comics.map((c, i) => ({
    rank: (page - 1) * (comics.length) + i + 1,
    ...c,
  }));

  return sendSuccess(res, {
    period, page, pagination,
    timestamp: getTimestamp(),
    total: ranked.length,
    results: ranked,
  }, `Berhasil mengambil ${ranked.length} trending komik (${period})`);
};
