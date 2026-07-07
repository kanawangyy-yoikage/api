// api/comic/analytics.js
// GET /comic/analytics
// Creator: matchadesu_

const { fetchHTML, parseComicCards, getTimestamp, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const start = Date.now();

  try {
    const [$home, $populer] = await Promise.all([
      fetchHTML("/"),
      fetchHTML("/komik/?orderby=popular"),
    ]);

    const homeComics = parseComicCards($home);
    const populerComics = parseComicCards($populer);

    const typeCount = {};
    [...homeComics, ...populerComics].forEach((c) => {
      const t = (c.type || "Unknown").toLowerCase();
      typeCount[t] = (typeCount[t] || 0) + 1;
    });

    const genreFreq = {};
    $home("a[href*='/genre/']").each((_, el) => {
      const name = $home(el).text().trim();
      if (name) genreFreq[name] = (genreFreq[name] || 0) + 1;
    });
    const topGenres = Object.entries(genreFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, freq]) => ({ name, frequency: freq }));

    const elapsed = Date.now() - start;

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: elapsed,
      analytics: {
        homepage: {
          totalItems: homeComics.length,
          withRating: homeComics.filter((c) => c.rating).length,
          withType: homeComics.filter((c) => c.type).length,
        },
        popular: {
          totalItems: populerComics.length,
          topRated: populerComics
            .filter((c) => c.rating)
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(0, 5)
            .map((c) => ({ title: c.title, rating: c.rating, slug: c.slug })),
        },
        typeDistribution: typeCount,
        topGenres,
        summary: {
          totalAnalyzed: homeComics.length + populerComics.length,
          uniqueTypes: Object.keys(typeCount).length,
          uniqueGenres: Object.keys(genreFreq).length,
          analysisTimeMs: elapsed,
        },
      },
    }, "Analytics Komiku berhasil diproses");
  } catch (err) {
    return sendError(res, `Gagal analytics: ${err.message}`, 500);
  }
};
