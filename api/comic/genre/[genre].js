// api/comic/genre/[genre].js
// GET /comic/genre/:genre?page=1
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const genre = req.query.genre || req.url.split("/genre/")[1]?.split("?")[0]?.replace(/\/$/, "");
  const page = parseInt(req.query.page) || 1;
  const order = req.query.order || "update";

  if (!genre) return sendError(res, "Slug genre tidak boleh kosong", 400);

  const path = page > 1
    ? `/genre/${genre}/page/${page}/?orderby=${order}`
    : `/genre/${genre}/?orderby=${order}`;

  try {
    const $ = await fetchHTML(path);
    const genreName = $("h1.entry-title, .page-title, h1, .archive-title").first().text().trim() || genre;
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    if (!comics.length) {
      return sendError(res, `Tidak ada komik ditemukan untuk genre: ${genre}`, 404);
    }

    return sendSuccess(res, {
      genre: { name: genreName, slug: genre },
      page, order, pagination,
      total: comics.length,
      results: comics,
    }, `Berhasil mengambil ${comics.length} komik genre "${genreName}" halaman ${page}`);
  } catch (err) {
    return sendError(res, `Gagal mengambil komik per genre: ${err.message}`, 500);
  }
};
