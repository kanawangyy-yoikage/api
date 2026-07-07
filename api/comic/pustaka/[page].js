// api/comic/pustaka/[page].js
// GET /comic/pustaka/:page
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const page = parseInt(req.query.page || req.url.split("/pustaka/")[1]?.split("?")[0]) || 1;
  const alpha = req.query.alpha || "";
  const type = req.query.type || "";

  const params = new URLSearchParams();
  if (alpha) params.set("order", alpha.toUpperCase());
  if (type) params.set("type", type);
  params.set("orderby", "title");

  const qs = params.toString();

  const paths = [
    page > 1 ? `/pustaka/page/${page}/${qs ? "?" + qs : ""}` : `/pustaka/${qs ? "?" + qs : ""}`,
    page > 1 ? `/daftar-komik/page/${page}/` : `/daftar-komik/`,
    page > 1 ? `/komik/page/${page}/?orderby=title` : `/komik/?orderby=title`,
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
    return sendError(res, `Tidak ada data pustaka di halaman ${page}`, 404);
  }

  return sendSuccess(res, {
    page,
    alpha: alpha || "ALL",
    type: type || "ALL",
    pagination,
    total: comics.length,
    results: comics,
  }, `Berhasil mengambil ${comics.length} komik pustaka halaman ${page}`);
};
