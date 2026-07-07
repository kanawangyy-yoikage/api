// api/comic/unlimited.js
// GET /comic/unlimited?page=1&limit=50
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
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const type = req.query.type || "";
  const order = req.query.order || "update";

  const start = Date.now();

  try {
    const pages = Math.ceil(limit / 18);
    const fetches = [];
    for (let i = 0; i < Math.min(pages, 3); i++) {
      const p = page + i;
      let path = `/komik/page/${p}/`;
      const params = new URLSearchParams();
      if (type) params.set("genre", type);
      if (order) params.set("orderby", order);
      const qs = params.toString();
      if (qs) path += `?${qs}`;
      fetches.push(fetchHTML(path));
    }

    const htmlPages = await Promise.allSettled(fetches);
    const allComics = [];
    let pagination = null;

    htmlPages.forEach((result) => {
      if (result.status === "fulfilled") {
        const $ = result.value;
        const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
        if (!pagination) pagination = parsePagination($);
        allComics.push(...comics);
      }
    });

    const seen = new Set();
    const dedup = allComics.filter((c) => {
      if (seen.has(c.slug)) return false;
      seen.add(c.slug); return true;
    });

    const results = dedup.slice(0, limit);

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: Date.now() - start,
      page,
      limit,
      pagination,
      total: results.length,
      fetched: allComics.length,
      results,
    }, `Unlimited access: berhasil mengambil ${results.length} komik`);
  } catch (err) {
    return sendError(res, `Gagal unlimited fetch: ${err.message}`, 500);
  }
};
