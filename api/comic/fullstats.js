// api/comic/fullstats.js
// GET /comic/fullstats
// Creator: matchadesu_

const { fetchHTML, getTimestamp, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const startTime = Date.now();

  try {
    const [$home, $populer, $terbaru] = await Promise.all([
      fetchHTML("/"),
      fetchHTML("/komik/?orderby=popular"),
      fetchHTML("/komik/"),
    ]);

    const elapsed = Date.now() - startTime;

    const homeCount = $home(".bge, .bs, .bsx, article").length;
    const populerCount = $populer(".bge, .bs, .bsx, article").length;
    const terbaru = $terbaru(".bge, .bs, .bsx, article").length;

    const genreCount = $home("a[href*='/genre/']").length;

    const totalPagesEl = $terbaru(".pagination .page-numbers:not(.next):not(.prev)").last().text();
    const totalPages = parseInt(totalPagesEl) || 1;
    const estimatedTotal = totalPages * terbaru;

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      responseTimeMs: elapsed,
      fullStats: {
        database: {
          estimatedTotalComics: estimatedTotal || "10.000+",
          comicsPerPage: terbaru || 12,
          estimatedTotalPages: totalPages,
          totalGenres: genreCount,
        },
        content: {
          homepageItems: homeCount,
          populerItems: populerCount,
          terbaruItems: terbaru,
          supportedTypes: ["Manga", "Manhwa", "Manhua", "Webtoon", "Novel"],
        },
        sources: {
          main: BASE_URL,
          thumbnail: "https://thumbnail.komiku.org",
        },
        api: {
          version: "1.0.0",
          creator: "matchadesu_",
          totalEndpoints: 28,
          cacheEnabled: false,
          scrapeEngine: "Cheerio v1 + Axios",
          deployTarget: "Vercel Serverless",
        },
      },
    }, "Full statistik Komiku API berhasil diambil");
  } catch (err) {
    return sendError(res, `Gagal mengambil full stats: ${err.message}`, 500);
  }
};
