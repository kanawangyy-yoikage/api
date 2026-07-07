// api/comic/homepage.js
// GET /comic/homepage
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const start = Date.now();

  try {
    const $ = await fetchHTML("/");

    const latestUpdate = parseComicCards($, ".bge, .bs, .bsx, article.post");

    const popular = [];
    $(".widget .popular-posts li, .sidebar .komik-item, .serieslist.pop li").each((_, el) => {
      const title = $(el).find("a").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || null;
      const rating = $(el).find(".rating, .score").text().trim() || null;
      if (title && href) popular.push({ title, slug: href.replace(/\/$/, "").split("/").pop(), url: href, image, rating });
    });

    const featured = [];
    $(".slider .item, .bigcover .item, #featured .item").each((_, el) => {
      const title = $(el).find("h2, h3, .title").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const image = $(el).find("img").first().attr("src") || $(el).find("img").first().attr("data-src") || null;
      const desc = $(el).find("p, .desc").first().text().trim();
      const type = $(el).find(".type").first().text().trim() || null;
      if (title && href) featured.push({ title, url: href, image, description: desc || null, type });
    });

    const navGenres = [];
    $("nav a[href*='/genre/'], .nav-genre a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.replace(/\/$/, "").split("/genre/")[1] || "";
      if (name && slug && !navGenres.find((g) => g.slug === slug)) {
        navGenres.push({ name, slug, url: href });
      }
    });

    const staffPick = [];
    $(".rekomendasi .item, .staff-pick .item").each((_, el) => {
      const title = $(el).find("a").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      if (title && href) staffPick.push({ title, url: href });
    });

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: Date.now() - start,
      featured: featured.length ? featured : null,
      latestUpdate: {
        total: latestUpdate.length,
        results: latestUpdate,
      },
      popular: popular.length ? { total: popular.length, results: popular } : null,
      staffPick: staffPick.length ? staffPick : null,
      navGenres: navGenres.length ? navGenres : null,
    }, `Berhasil mengambil homepage Komiku (${latestUpdate.length} komik)`);
  } catch (err) {
    return sendError(res, `Gagal mengambil homepage: ${err.message}`, 500);
  }
};
