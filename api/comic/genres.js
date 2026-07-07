// api/comic/genres.js
// GET /comic/genres
// Creator: matchadesu_

const { fetchHTML, BASE_URL } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const genres = [];
    const paths = ["/genre/", "/genres/", "/daftar-genre/", "/"];

    let $ = null;
    for (const p of paths) {
      try {
        $ = await fetchHTML(p);
        $("a[href*='/genre/']").each((_, el) => {
          const name = $(el).text().trim();
          const href = $(el).attr("href") || "";
          const slugPart = href.replace(/\/$/, "").split("/genre/")[1] || "";
          if (name && slugPart && !genres.find((g) => g.slug === slugPart)) {
            const count = $(el).find(".count").text().trim() || null;
            genres.push({
              name,
              slug: slugPart,
              url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
              count: count ? parseInt(count) : null,
            });
          }
        });
        if (genres.length > 5) break;
      } catch { /* lanjut */ }
    }

    if (genres.length < 5) {
      const fallback = [
        "Action", "Adventure", "Comedy", "Cooking", "Demons", "Detective",
        "Drama", "Ecchi", "Fantasy", "Game", "Gender Bender", "Gore", "Harem",
        "Historical", "Horror", "Isekai", "Josei", "Magic", "Martial Arts",
        "Mature", "Mecha", "Medical", "Military", "Mystery", "One Shot",
        "Post-Apocalyptic", "Psychological", "Reincarnation", "Romance",
        "School Life", "Sci-fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen",
        "Shounen Ai", "Slice of Life", "Smut", "Sports", "Super Power",
        "Supernatural", "Survival", "Thriller", "Time Travel", "Tragedy",
        "Vampire", "Webtoons", "Yaoi", "Yuri",
      ];
      fallback.forEach((name) => {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        if (!genres.find((g) => g.slug === slug)) {
          genres.push({ name, slug, url: `${BASE_URL}/genre/${slug}/`, count: null });
        }
      });
    }

    return sendSuccess(res, {
      total: genres.length,
      genres,
    }, `Berhasil mengambil ${genres.length} genre komik`);
  } catch (err) {
    return sendError(res, `Gagal mengambil genres: ${err.message}`, 500);
  }
};
