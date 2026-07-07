// api/comic/type/[type].js
// GET /comic/type/:type?page=1
// Creator: matchadesu_

const {
  fetchHTML, parseComicCards, parsePagination,
} = require("../../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../../lib/response");

const TYPE_MAP = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
  webtoon: "Webtoon",
  novel: "Novel",
  doujin: "Doujin",
  ova: "OVA",
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const type = (req.query.type || req.url.split("/type/")[1]?.split("?")[0]?.replace(/\/$/, "") || "").toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const order = req.query.order || "update";

  if (!type) return sendError(res, "Tipe komik tidak boleh kosong", 400);

  const validTypes = Object.keys(TYPE_MAP);
  if (!validTypes.includes(type)) {
    return sendError(res, `Tipe tidak valid. Pilih: ${validTypes.join(", ")}`, 400);
  }

  const paths = [
    page > 1 ? `/${type}/page/${page}/` : `/${type}/`,
    page > 1 ? `/komik/page/${page}/?type=${type}` : `/komik/?type=${type}`,
    page > 1 ? `/komik/page/${page}/?orderby=${order}&type=${type}` : `/komik/?orderby=${order}&type=${type}`,
  ];

  let $, comics, pagination;

  for (const p of paths) {
    try {
      $ = await fetchHTML(p);
      comics = parseComicCards($, ".bge, .bs, .bsx, article.post");
      if (comics.length) { pagination = parsePagination($); break; }
    } catch { /* lanjut */ }
  }

  if (!comics?.length) {
    return sendError(res, `Tidak ada komik tipe "${type}" ditemukan`, 404);
  }

  return sendSuccess(res, {
    type: { slug: type, name: TYPE_MAP[type] },
    page, order, pagination,
    total: comics.length,
    results: comics,
  }, `Berhasil mengambil ${comics.length} komik tipe "${TYPE_MAP[type]}" halaman ${page}`);
};
