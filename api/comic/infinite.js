// api/comic/infinite.js
// GET /comic/infinite?cursor=0&limit=12&type=&genre=&order=update
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const cursor = parseInt(req.query.cursor) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 12, 50);
  const type = req.query.type || "";
  const genre = req.query.genre || "";
  const order = req.query.order || "update";

  const ITEMS_PER_PAGE = 18;
  const page = Math.floor(cursor / ITEMS_PER_PAGE) + 1;
  const offsetInPage = cursor % ITEMS_PER_PAGE;

  const params = new URLSearchParams({ orderby: order });
  if (type) params.set("type", type);
  if (genre) params.set("genre", genre);

  try {
    const path = page > 1
      ? `/komik/page/${page}/?${params.toString()}`
      : `/komik/?${params.toString()}`;

    const $ = await fetchHTML(path);
    let comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
    const pagination = parsePagination($);

    comics = comics.slice(offsetInPage, offsetInPage + limit);

    if (comics.length < limit && pagination.hasNextPage) {
      const nextPath = `/komik/page/${page + 1}/?${params.toString()}`;
      try {
        const $next = await fetchHTML(nextPath);
        const more = parseComicCards($next, ".bge, .bs, .bsx, article.post");
        comics.push(...more.slice(0, limit - comics.length));
      } catch { /* tidak kritis */ }
    }

    const nextCursor = cursor + comics.length;
    const hasMore = pagination.hasNextPage || offsetInPage + limit < ITEMS_PER_PAGE;

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      cursor,
      nextCursor: hasMore ? nextCursor : null,
      limit,
      hasMore,
      total: comics.length,
      results: comics,
    }, `Infinite load cursor ${cursor}: ${comics.length} komik dimuat`);
  } catch (err) {
    return sendError(res, `Gagal infinite load: ${err.message}`, 500);
  }
};
