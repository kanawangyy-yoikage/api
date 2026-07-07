// api/comic/recommendations.js
// GET /comic/recommendations?slug=naruto&count=12
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, getTimestamp,
} = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const slug = req.query.slug || "";
  const count = Math.min(parseInt(req.query.count) || 12, 30);
  const genre = req.query.genre || "";

  try {
    let baseGenres = genre ? [genre] : [];
    let comicTitle = "";

    if (slug) {
      try {
        const $detail = await fetchHTML(`/manga/${slug}/`);
        comicTitle = $detail("h1.entry-title, h1").first().text().trim();
        $detail("a[href*='/genre/']").each((_, el) => {
          const g = $detail(el).attr("href")?.replace(/\/$/, "").split("/genre/")[1];
          if (g && !baseGenres.includes(g)) baseGenres.push(g);
        });
      } catch { /* tidak masalah */ }
    }

    const recommendations = [];
    const seen = new Set([slug]);

    if (baseGenres.length) {
      for (const g of baseGenres.slice(0, 2)) {
        try {
          const $ = await fetchHTML(`/genre/${g}/`);
          const comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
          comics.forEach((c) => {
            if (!seen.has(c.slug)) {
              seen.add(c.slug);
              recommendations.push({ ...c, recommendedBecause: `Genre: ${g}` });
            }
          });
        } catch { /* lanjut */ }
        if (recommendations.length >= count) break;
      }
    }

    if (recommendations.length < count) {
      const $ = await fetchHTML("/komik/?orderby=popular");
      const comics = parseComicCards($, ".bge, .bs, .bsx");
      comics.forEach((c) => {
        if (!seen.has(c.slug) && recommendations.length < count) {
          seen.add(c.slug);
          recommendations.push({ ...c, recommendedBecause: "Populer" });
        }
      });
    }

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      basedOn: slug ? { slug, title: comicTitle, genres: baseGenres } : { genres: baseGenres },
      total: recommendations.length,
      results: recommendations.slice(0, count),
    }, `Berhasil mengambil ${Math.min(recommendations.length, count)} rekomendasi komik`);
  } catch (err) {
    return sendError(res, `Gagal mengambil rekomendasi: ${err.message}`, 500);
  }
};
