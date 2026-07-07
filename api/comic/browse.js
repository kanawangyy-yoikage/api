// api/comic/browse.js
// GET /comic/browse?page=1&type=&genre=&status=&order=update
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
    page = "1",
    type = "",
    genre = "",
    status = "",
    order = "update",
    alpha = "",
  } = req.query;

  const pageNum = parseInt(page) || 1;

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (genre) params.set("genre", genre);
  if (status) params.set("status", status);
  if (order) params.set("orderby", order);
  if (alpha) params.set("order", alpha);

  const qs = params.toString();
  const path = pageNum > 1
    ? `/komik/page/${pageNum}/${qs ? "?" + qs : ""}`
    : `/komik/${qs ? "?" + qs : ""}`;

  try {
    const $ = await fetchHTML(path);
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    const activeFilters = { type, genre, status, order, alpha };

    return sendSuccess(res, {
      page: pageNum,
      filters: activeFilters,
      pagination,
      total: comics.length,
      results: comics,
    }, comics.length
      ? `Browse: ${comics.length} komik ditemukan halaman ${pageNum}`
      : "Tidak ada komik dengan filter tersebut"
    );
  } catch (err) {
    return sendError(res, `Gagal browse komik: ${err.message}`, 500);
  }
};
