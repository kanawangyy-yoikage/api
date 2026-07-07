// api/comic/terbaru.js
// GET /comic/terbaru?page=1
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
  const order = req.query.order || "update";

  const path = page > 1
    ? `/komik/page/${page}/?orderby=${order}`
    : `/komik/?orderby=${order}`;

  try {
    const $ = await fetchHTML(path);
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    if (!comics.length) {
      return sendError(res, "Tidak ada komik terbaru ditemukan", 404);
    }

    return sendSuccess(res, {
      page, order, pagination,
      total: comics.length,
      results: comics,
    }, `Berhasil mengambil ${comics.length} komik terbaru halaman ${page}`);
  } catch (err) {
    return sendError(res, `Gagal mengambil terbaru: ${err.message}`, 500);
  }
};
