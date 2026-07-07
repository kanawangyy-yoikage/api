// api/comic/chapter/[slug].js
// GET /comic/chapter/:slug
// Creator: matchadesu_

const {
  fetchHTML, parseChapterImages, extractSlug, getTimestamp, BASE_URL,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const rawSlug = req.query.slug || req.url.split("/chapter/")[1]?.split("?")[0]?.replace(/\/$/, "") || "";
  const slug = rawSlug.replace(/\/navigation$/, "");

  if (!slug) return sendError(res, "Slug chapter tidak boleh kosong", 400);

  const paths = [
    `/${slug}/`,
    `/chapter/${slug}/`,
    `/baca/${slug}/`,
    `/read/${slug}/`,
  ];

  let $, usedPath;
  for (const p of paths) {
    try {
      $ = await fetchHTML(p);
      if ($("h1, .entry-title, #Baca_Komik, .chapter-images").length) { usedPath = p; break; }
    } catch { /* lanjut */ }
  }

  if (!$) return sendError(res, `Chapter "${slug}" tidak ditemukan`, 404);

  try {
    const title = $("h1.entry-title, h1, .reader-title").first().text().trim() || slug;

    const images = parseChapterImages($);

    if (!images.length) {
      const seen = new Set();
      $(".entry-content img, .chapter-area img, main img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
        if (src && src.startsWith("http") && !seen.has(src) && !src.includes("logo")) {
          seen.add(src);
          images.push({ page: i + 1, url: src, width: null, height: null });
        }
      });
    }

    const prevChapter =
      $(".prevch a, a.prev-chapter, .chapter-nav .prev a, a[rel='prev']").first().attr("href") || null;
    const nextChapter =
      $(".nextch a, a.next-chapter, .chapter-nav .next a, a[rel='next']").first().attr("href") || null;

    const parentEl = $("a[href*='/manga/'], .breadcrumb a").first();
    const parentComic = parentEl.text().trim()
      ? { title: parentEl.text().trim(), url: parentEl.attr("href") || "", slug: extractSlug(parentEl.attr("href") || "") }
      : null;

    const chNumMatch = (slug + " " + title).match(/chapter[- ]?(\d+(\.\d+)?)/i);
    const chapterNumber = chNumMatch ? parseFloat(chNumMatch[1]) : null;

    const breadcrumbs = [];
    $(".breadcrumb a, .breadcrumbs a").each((_, el) => {
      breadcrumbs.push({ label: $(el).text().trim(), url: $(el).attr("href") || "" });
    });

    const chapterSelect = [];
    $("select.chapter option, #chapter-select option").each((_, el) => {
      const label = $(el).text().trim();
      const val = $(el).attr("value") || "";
      if (label && val) chapterSelect.push({ label, url: val });
    });

    if (!images.length) {
      return sendError(res, `Tidak ada halaman ditemukan untuk chapter: "${slug}"`, 404);
    }

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      title,
      slug,
      url: `${BASE_URL}${usedPath}`,
      chapterNumber,
      parentComic,
      breadcrumbs: breadcrumbs.length ? breadcrumbs : null,
      totalPages: images.length,
      pages: images,
      navigation: {
        prevChapter: prevChapter || null,
        nextChapter: nextChapter || null,
      },
      chapterSelect: chapterSelect.length ? chapterSelect : null,
    }, `Berhasil mengambil ${images.length} halaman chapter: ${title}`);
  } catch (err) {
    return sendError(res, `Gagal mengambil chapter: ${err.message}`, 500);
  }
};
