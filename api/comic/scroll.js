// api/comic/scroll.js
// GET /comic/scroll?page=1&type=&genre=&order=update
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
  const type = req.query.type || "";
  const genre = req.query.genre || "";
  const order = req.query.order || "update";

  const params = new URLSearchParams({ orderby: order });
  if (type) params.set("type", type);
  if (genre) params.set("genre", genre);

  const path = page > 1
    ? `/komik/page/${page}/?${params.toString()}`
    : `/komik/?${params.toString()}`;

  try {
    const $ = await fetchHTML(path);
    const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      scrollPage: page,
      hasMore: pagination.hasNextPage,
      nextPage: pagination.hasNextPage ? page + 1 : null,
      pagination,
      total: comics.length,
      results: comics,
    }, `Infinite scroll halaman ${page}: ${comics.length} komik dimuat`);
  } catch (err) {
    return sendError(res, `Gagal scroll data: ${err.message}`, 500);
  }
};
