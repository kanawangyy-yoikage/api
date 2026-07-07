// api/comic/populer.js
// GET /comic/populer?page=1
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const page = parseInt(req.query.page) || 1;
  const paths = [
    page > 1 ? `/komik/page/${page}/?orderby=popular` : `/komik/?orderby=popular`,
    page > 1 ? `/populer/page/${page}/` : `/populer/`,
    page > 1 ? `/popular/page/${page}/` : `/popular/`,
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
    return sendError(res, "Tidak ada komik populer ditemukan", 404);
  }

  return sendSuccess(res, {
    page, pagination, total: comics.length, results: comics,
  }, `Berhasil mengambil ${comics.length} komik populer halaman ${page}`);
};
