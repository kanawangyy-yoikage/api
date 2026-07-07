// api/comic/chapter/[slug]/navigation.js
// GET /comic/chapter/:slug/navigation
// Creator: matchadesu_

const {
  fetchHTML, extractSlug, getTimestamp, BASE_URL,
} = require("../../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../../lib/response");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const slug = req.query.slug || req.url.split("/chapter/")[1]?.split("/navigation")[0]?.replace(/\/$/, "");
  if (!slug) return sendError(res, "Slug chapter tidak boleh kosong", 400);

  const paths = [`/${slug}/`, `/chapter/${slug}/`, `/baca/${slug}/`];

  let $, usedPath;
  for (const p of paths) {
    try {
      $ = await fetchHTML(p);
      if ($("h1, .entry-title").first().text().trim()) { usedPath = p; break; }
    } catch { /* lanjut */ }
  }

  if (!$) return sendError(res, `Chapter "${slug}" tidak ditemukan`, 404);

  try {
    const title = $("h1.entry-title, h1").first().text().trim() || slug;

    const prevHref = $(".prevch a, a.prev-chapter, .chapter-nav .prev a, a[rel='prev']").first().attr("href") || null;
    const nextHref = $(".nextch a, a.next-chapter, .chapter-nav .next a, a[rel='next']").first().attr("href") || null;

    const allChapters = [];
    $("select.chapter option, #chapter-select option, .chapter-select option").each((_, el) => {
      const label = $(el).text().trim();
      const url = $(el).attr("value") || "";
      const isCur = $(el).is(":selected") || $(el).attr("selected");
      if (label && url) {
        allChapters.push({
          label,
          slug: extractSlug(url),
          url,
          isCurrent: !!isCur,
        });
      }
    });

    const breadcrumbs = [];
    $(".breadcrumb a, .breadcrumbs a, #breadcrumbs a").each((_, el) => {
      breadcrumbs.push({ label: $(el).text().trim(), url: $(el).attr("href") || "" });
    });

    const parentEl = $(".breadcrumb a:not(:last-child), .breadcrumbs a").first();
    const parent = parentEl.text().trim()
      ? { title: parentEl.text().trim(), url: parentEl.attr("href") || "", slug: extractSlug(parentEl.attr("href") || "") }
      : null;

    const numMatch = (slug + " " + title).match(/chapter[- ]?(\d+(\.\d+)?)/i);
    const chNum = numMatch ? parseFloat(numMatch[1]) : null;

    const totalPages =
      $("#Baca_Komik img, .chapter-images img, .reading-content img").length || null;

    return sendSuccess(res, {
      timestamp: getTimestamp(),
      title,
      slug,
      url: `${BASE_URL}${usedPath}`,
      chapterNumber: chNum,
      totalPages,
      parentComic: parent,
      breadcrumbs: breadcrumbs.length ? breadcrumbs : null,
      navigation: {
        prevChapter: prevHref
          ? { slug: extractSlug(prevHref), url: prevHref }
          : null,
        nextChapter: nextHref
          ? { slug: extractSlug(nextHref), url: nextHref }
          : null,
        currentIndex: allChapters.findIndex((c) => c.isCurrent),
        totalChapters: allChapters.length,
        allChapters: allChapters.length ? allChapters : null,
      },
    }, `Navigasi chapter "${title}" berhasil diambil`);
  } catch (err) {
    return sendError(res, `Gagal mengambil navigasi chapter: ${err.message}`, 500);
  }
};
