// api/comic/comic/[slug].js
// GET /comic/comic/:slug
// Creator: matchadesu_

const {
  fetchHTML, parseComicInfo, extractSlug,
  getThumbnail, getTimestamp, BASE_URL,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const slug = req.query.slug || req.url.split("/comic/")[1]?.split("?")[0]?.replace(/\/$/, "");
  if (!slug) return sendError(res, "Slug komik tidak boleh kosong", 400);

  const paths = [
    `/manga/${slug}/`,
    `/${slug}/`,
    `/komik/${slug}/`,
    `/manhwa/${slug}/`,
    `/manhua/${slug}/`,
  ];

  let $, usedPath;
  for (const p of paths) {
    try {
      $ = await fetchHTML(p);
      if ($("h1.entry-title, h1").first().text().trim()) { usedPath = p; break; }
    } catch { /* lanjut */ }
  }

  if (!$) return sendError(res, `Komik "${slug}" tidak ditemukan`, 404);

  try {
    const title = $("h1.entry-title, h1.komik-title, h1").first().text().trim();
    if (!title) return sendError(res, `Komik "${slug}" tidak ditemukan`, 404);

    const rawThumb =
      $(".thumb img, .cover img, .featured-image img, #komik-image img").first().attr("src") ||
      $(".thumb img").first().attr("data-src") || null;
    const thumbnail = getThumbnail(slug, rawThumb);

    const synopsis =
      $(".entry-content p, .synop p, .desc p, #synopsis p").first().text().trim() ||
      $(".entry-content, .synop, .desc").first().text().slice(0, 800).trim() || null;

    const info = parseComicInfo($);

    const genres = [];
    $("a[href*='/genre/'], .genre a, .genres a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (name && !genres.find((g) => g.name === name)) {
        genres.push({
          name,
          slug: href.replace(/\/$/, "").split("/genre/")[1] || extractSlug(href),
          url: href,
        });
      }
    });

    const type = $(".type, .typeflag, .comic-type").first().text().trim() || info["tipe"] || null;
    const status = $(".status, .statusx").first().text().trim() || info["status"] || null;
    const rating = $(".numscore, .rating, .score").first().text().trim() || null;
    const author = $(".author a, .info .author").first().text().trim() || info["pengarang"] || info["author"] || null;
    const artist = $(".artist a, .info .artist").first().text().trim() || info["artist"] || null;

    const altTitles = [];
    $(".alternative, .alt-title, .jtitle").each((_, el) => {
      const t = $(el).text().trim();
      if (t && t !== title) altTitles.push(t);
    });

    const chapters = [];
    $(".chapter-list li, #chapter-list li, .eplister ul li, .episodelist li").each((_, el) => {
      const chTitle = $(el).find("a").first().text().trim();
      const chHref = $(el).find("a").first().attr("href") || "";
      const chDate = $(el).find(".date, time, .chapterdate").first().text().trim();
      const chNum = $(el).find(".chapternum").first().text().trim();
      const views = $(el).find(".chapterview").first().text().trim();
      if (chTitle && chHref) {
        chapters.push({
          title: chTitle,
          number: chNum || null,
          slug: extractSlug(chHref),
          url: chHref,
          date: chDate || null,
          views: views || null,
        });
      }
    });

    const related = [];
    $(".related-komik .item, .series-relation .item, .recommendations .item").each((_, el) => {
      const t = $(el).find("a").first().text().trim();
      const href = $(el).find("a").first().attr("href") || "";
      const img = $(el).find("img").first().attr("src") || null;
      if (t && href) related.push({ title: t, slug: extractSlug(href), url: href, image: img });
    });

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      title,
      slug,
      url: `${BASE_URL}${usedPath}`,
      thumbnail,
      type: type || null,
      status: status || null,
      rating: rating || null,
      author: author || null,
      artist: artist || null,
      synopsis,
      altTitles: altTitles.length ? altTitles : null,
      genres,
      info,
      totalChapters: chapters.length,
      chapters: chapters.length ? chapters : null,
      related: related.length ? related : null,
    }, `Berhasil mengambil detail komik: ${title}`);
  } catch (err) {
    return sendError(res, `Gagal mengambil detail komik: ${err.message}`, 500);
  }
};
