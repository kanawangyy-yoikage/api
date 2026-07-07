// api/comic/advanced-search.js
// GET /comic/advanced-search?q=&genre=&type=&status=&order=update&page=1
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const {
    q = "",
    genre = "",
    type = "",
    status = "",
    order = "update",
    page = "1",
    alpha = "",
    minrating = "",
  } = req.query;

  const pageNum = parseInt(page) || 1;

  const params = new URLSearchParams();
  if (q) params.set("s", q);
  if (genre) params.set("genre", genre);
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  if (order) params.set("orderby", order);
  if (alpha) params.set("order", alpha);
  if (minrating) params.set("minrating", minrating);

  const qs = params.toString();
  const path = pageNum > 1
    ? `/komik/page/${pageNum}/${qs ? "?" + qs : ""}`
    : `/komik/${qs ? "?" + qs : ""}`;

  try {
    const $ = await fetchHTML(path);
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    return sendSuccess(res, {
      filters: { q, genre, type, status, order, alpha, minrating },
      page: pageNum, pagination,
      total: comics.length,
      results: comics,
    }, comics.length
      ? `Ditemukan ${comics.length} komik dengan filter yang diberikan`
      : "Tidak ada komik dengan filter tersebut"
    );
  } catch (err) {
    return sendError(res, `Gagal advanced search: ${err.message}`, 500);
  }
};
