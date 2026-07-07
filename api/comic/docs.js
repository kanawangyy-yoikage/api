// api/comic/docs.js
// GET /comic/docs
// Creator: matchadesu_

const { sendSuccess } = require("../../lib/response");
const { BASE_URL, THUMB_URL } = require("../../lib/scraper-comic");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  return sendSuccess(res, {
    name: "Komiku REST API",
    version: "1.0.0",
    creator: "matchadesu_",
    description: "REST API Scraper untuk Komiku.org - Manga, Manhwa, Manhua Indonesia",
    source: BASE_URL,
    thumbnail: THUMB_URL,
    builtWith: ["Node.js", "Cheerio", "Axios", "Vercel"],
    rateLimit: "Unlimited (Fair Use)",
    baseURL: "https://your-api.vercel.app",
    endpoints: {
      "📊 Info & Statistik": {
        docs: "GET /comic/docs",
        comparison: "GET /comic/comparison",
        fullstats: "GET /comic/fullstats",
        stats: "GET /comic/stats",
        analytics: "GET /comic/analytics",
        health: "GET /comic/health",
      },
      "🏠 Beranda": {
        homepage: "GET /comic/homepage",
        unlimited: "GET /comic/unlimited",
        realtime: "GET /comic/realtime",
      },
      "📚 Daftar & Browse": {
        terbaru: "GET /comic/terbaru?page=1",
        populer: "GET /comic/populer?page=1",
        trending: "GET /comic/trending?page=1",
        random: "GET /comic/random?count=12",
        browse: "GET /comic/browse?page=1&type=manga&order=update",
        typeFilter: "GET /comic/type/:type  → manga|manhwa|manhua|webtoon|novel",
        genreList: "GET /comic/genres",
        genreComics: "GET /comic/genre/:genre?page=1",
        berwarna: "GET /comic/berwarna/:page",
        pustaka: "GET /comic/pustaka/:page",
      },
      "🔍 Pencarian": {
        search: "GET /comic/search?q=naruto&page=1",
        advancedSearch: "GET /comic/advanced-search?q=&genre=&type=&status=&order=&page=",
        recommendations: "GET /comic/recommendations?slug=naruto",
      },
      "📖 Detail & Baca": {
        comicDetail: "GET /comic/comic/:slug",
        readChapter: "GET /comic/chapter/:slug",
        navigation: "GET /comic/chapter/:slug/navigation",
      },
      "⚡ Fitur Lanjutan": {
        scroll: "GET /comic/scroll?page=1",
        infinite: "GET /comic/infinite?cursor=0&limit=12",
        favorites: "GET /comic/favorites  ← Perlu Header: x-user-id",
      },
    },
    queryParams: {
      page: "Nomor halaman (default: 1)",
      limit: "Jumlah item per request (default: 12, max: 50)",
      q: "Kata kunci pencarian",
      type: "manga | manhwa | manhua | webtoon | novel",
      genre: "Slug genre (contoh: action, romance)",
      status: "ongoing | completed | hiatus",
      order: "update | title | rating | popular",
      cursor: "ID cursor untuk infinite scroll",
      slug: "Slug komik/chapter",
    },
    responseFormat: {
      status: "success | failed",
      creator: "matchadesu_",
      statusCode: 200,
      statusMessage: "OK",
      message: "Pesan deskripsi",
      ok: true,
      data: "{ ... }",
    },
  }, "Dokumentasi API Komiku by matchadesu_");
};
