// api/comic/favorites.js
// GET/POST/DELETE /comic/favorites
// Requires Header: x-user-id atau ?userId=
// Creator: matchadesu_

const { getTimestamp } = require("../../lib/scraper-comic");
const { sendSuccess, sendError } = require("../../lib/response");

// ─── In-Memory Store (per serverless instance) ─────────────────────────────────
// Catatan: di production gunakan database (Redis/MongoDB/Supabase) karena
// instance serverless bisa di-recycle sewaktu-waktu dan data ini tidak persisten.
const favoritesStore = new Map();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Creator", "matchadesu_");
  if (req.method === "OPTIONS") return res.status(200).end();

  const userId =
    req.headers["x-user-id"] ||
    req.query.userId ||
    req.query.uid || null;

  if (!userId) {
    return res.status(401).json({
      status: "failed",
      creator: "matchadesu_",
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "Header 'x-user-id' atau query ?userId= diperlukan untuk mengakses favorites",
      ok: false,
      data: {
        hint: "Tambahkan header: x-user-id: <your-user-id>",
        example: "GET /comic/favorites?userId=user123",
        note: "Favorites disimpan sementara per serverless instance. Untuk persistensi, hubungkan database.",
      },
    });
  }

  const method = req.method;

  if (method === "GET") {
    const userFavs = favoritesStore.get(userId) || [];
    return sendSuccess(res, {
      userId,
      timestamp: getTimestamp(),
      total: userFavs.length,
      favorites: userFavs,
    }, userFavs.length
      ? `Berhasil mengambil ${userFavs.length} favorit user ${userId}`
      : "Belum ada favorit tersimpan"
    );
  }

  if (method === "POST") {
    const { slug, title, url, thumbnail, type } = req.body || req.query;
    if (!slug) return sendError(res, "Slug komik diperlukan untuk menambah favorit", 400);

    const userFavs = favoritesStore.get(userId) || [];
    if (userFavs.find((f) => f.slug === slug)) {
      return sendError(res, `Komik "${slug}" sudah ada di favorit`, 409);
    }

    const newFav = {
      slug,
      title: title || slug,
      url: url || `https://komiku.org/manga/${slug}/`,
      thumbnail: thumbnail || null,
      type: type || null,
      addedAt: getTimestamp(),
    };

    userFavs.push(newFav);
    favoritesStore.set(userId, userFavs);

    return sendSuccess(res, {
      userId,
      added: newFav,
      total: userFavs.length,
    }, `Komik "${slug}" berhasil ditambahkan ke favorit`);
  }

  if (method === "DELETE") {
    const { slug } = req.query || req.body || {};
    if (!slug) return sendError(res, "Slug komik diperlukan untuk menghapus favorit", 400);

    const userFavs = favoritesStore.get(userId) || [];
    const idx = userFavs.findIndex((f) => f.slug === slug);

    if (idx === -1) return sendError(res, `Komik "${slug}" tidak ada di favorit`, 404);

    const removed = userFavs.splice(idx, 1)[0];
    favoritesStore.set(userId, userFavs);

    return sendSuccess(res, {
      userId,
      removed,
      total: userFavs.length,
    }, `Komik "${slug}" berhasil dihapus dari favorit`);
  }

  return sendError(res, `Method ${method} tidak didukung. Gunakan GET, POST, atau DELETE`, 405);
};
