// api/comic/berwarna/[page].js
// GET /comic/berwarna/:page
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const page = parseInt(req.query.page || req.url.split("/berwarna/")[1]?.split("?")[0]) || 1;

  const paths = [
    page > 1 ? `/komik-berwarna/page/${page}/` : `/komik-berwarna/`,
    page > 1 ? `/berwarna/page/${page}/` : `/berwarna/`,
    page > 1 ? `/genre/full-color/page/${page}/` : `/genre/full-color/`,
    page > 1 ? `/genre/colored/page/${page}/` : `/genre/colored/`,
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
    return sendError(res, `Tidak ada komik berwarna di halaman ${page}`, 404);
  }

  return sendSuccess(res, {
    page, pagination, total: comics.length, results: comics,
  }, `Berhasil mengambil ${comics.length} komik berwarna halaman ${page}`);
};
