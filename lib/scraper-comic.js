// lib/scraper-comic.js
// Core Scraper Engine untuk Komiku
// Creator: matchadesu_

const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio = require("cheerio");
const UserAgent = require("user-agents");

const BASE_URL = "https://komiku.org";
const THUMB_URL = "https://thumbnail.komiku.org";
const API_BASE = "https://komiku.org/api";

// ─── HTTP Client ───────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  maxRedirects: 5,
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Cache-Control": "max-age=0",
    Referer: BASE_URL + "/",
    Origin: BASE_URL,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  },
});

// ─── JSON / API Client ─────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: BASE_URL + "/",
  },
});

// ─── Retry Logic ───────────────────────────────────────────────────────────────
[client, apiClient].forEach((c) => {
  axiosRetry(c, {
    retries: 4,
    retryDelay: (n) => n * 1500,
    retryCondition: (err) =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) ||
      [429, 500, 502, 503, 504].includes(err.response?.status),
  });
});

// ─── Random User-Agent per request ────────────────────────────────────────────
[client, apiClient].forEach((c) => {
  c.interceptors.request.use((cfg) => {
    cfg.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
    return cfg;
  });
});

// ─── Error Response Interceptor ───────────────────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err.response?.status;
    if (code === 403) throw new Error("Akses ditolak server (403 Forbidden)");
    if (code === 429) throw new Error("Rate limited (429). Tunggu sebentar.");
    if (code === 404) throw new Error("Halaman tidak ditemukan (404)");
    throw err;
  }
);

// ─── Fetch HTML → Cheerio ──────────────────────────────────────────────────────
async function fetchHTML(path = "/") {
  const res = await client.get(path);
  return cheerio.load(res.data);
}

// ─── Fetch Full URL ────────────────────────────────────────────────────────────
async function fetchHTMLByURL(url) {
  const res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": new UserAgent({ deviceCategory: "desktop" }).toString(),
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      Referer: BASE_URL + "/",
    },
  });
  return cheerio.load(res.data);
}

// ─── Fetch JSON API ────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await apiClient.get(path);
  return res.data;
}

// ─── Thumbnail URL Builder ─────────────────────────────────────────────────────
function buildThumb(slug, size = "medium") {
  if (!slug) return null;
  return `${THUMB_URL}/${size}/${slug}.jpg`;
}

// ─── Parse Komik Card ──────────────────────────────────────────────────────────
function parseComicCards($, selector = ".bge, .bs, .bsx, article.post, .komik-item") {
  const results = [];

  $(selector).each((_, el) => {
    const $el = $(el);

    const title =
      $el.find("h3 a, h2 a, .tt h2, .ntitle a, .bigor h3, a .tt").first().text().trim() ||
      $el.find("a").first().attr("title") || "";

    const href =
      $el.find("h3 a, h2 a, .tt h2 a").first().attr("href") ||
      $el.find("a").first().attr("href") || "";

    const image =
      $el.find("img").first().attr("src") ||
      $el.find("img").first().attr("data-src") ||
      $el.find("img").first().attr("data-lazy-src") || null;

    const type =
      $el.find(".type, .sts, .typeflag").first().text().trim() ||
      $el.find("span.type").first().text().trim() || null;

    const latestChapter =
      $el.find(".lch a, .chapter a, .epxs, .chapter-list a").first().text().trim() || null;

    const rating =
      $el.find(".numscore, .rating, .score").first().text().trim() || null;

    const genres = [];
    $el.find("a[href*='/genre/'], .genres a").each((_, g) => {
      const gName = $(g).text().trim();
      if (gName) genres.push(gName);
    });

    const status =
      $el.find(".status, .sts, .statusx").first().text().trim() || null;

    const updatedAt =
      $el.find(".date, .updated, time").first().text().trim() ||
      $el.find("time").first().attr("datetime") || null;

    const slug = extractSlug(href);

    if (title && href) {
      results.push({
        title,
        slug,
        url: normalizeURL(href),
        thumbnail: image || buildThumb(slug),
        type: type || null,
        latestChapter: latestChapter || null,
        rating: rating || null,
        status: status || null,
        genres: genres.length ? genres : null,
        updatedAt: updatedAt || null,
      });
    }
  });

  return results;
}

// ─── Parse Pagination ──────────────────────────────────────────────────────────
function parsePagination($) {
  const cur = $(".pagination .current, .page-numbers.current, .paginado .active").first().text().trim();
  const pages = [];
  $(".pagination .page-numbers, .paginado a").each((_, el) => {
    const n = parseInt($(el).text().trim());
    if (!isNaN(n)) pages.push(n);
  });
  const max = pages.length ? Math.max(...pages) : 1;
  const next = $("a.next, .next.page-numbers").first().attr("href") || null;
  const prev = $("a.prev, .prev.page-numbers").first().attr("href") || null;

  return {
    currentPage: parseInt(cur) || 1,
    totalPages: max,
    hasNextPage: !!next,
    hasPrevPage: !!prev,
    nextPage: next,
    prevPage: prev,
  };
}

// ─── Parse Chapter Images ──────────────────────────────────────────────────────
function parseChapterImages($) {
  const images = [];
  const seen = new Set();

  const selectors = [
    "#Baca_Komik img",
    ".chapter-images img",
    ".comic-reader img",
    ".img-loading",
    "#comic_chapter img",
    ".page-break img",
    ".reading-content img",
  ];

  for (const sel of selectors) {
    $(sel).each((i, el) => {
      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-lazy-src") ||
        $(el).attr("data-original") || "";
      if (src && !seen.has(src) && src.startsWith("http")) {
        seen.add(src);
        images.push({
          page: i + 1,
          url: src,
          width: $(el).attr("width") ? parseInt($(el).attr("width")) : null,
          height: $(el).attr("height") ? parseInt($(el).attr("height")) : null,
        });
      }
    });
    if (images.length) break;
  }

  return images;
}

// ─── Parse Comic Detail Info ───────────────────────────────────────────────────
function parseComicInfo($) {
  const info = {};

  $(".infotable tr, .comic-info tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().replace(":", "").trim().toLowerCase().replace(/\s+/g, "_");
      const value = $(cells[1]).text().trim();
      if (key && value) info[key] = value;
    }
  });

  $(".info-list dt, .spe span").each((_, el) => {
    const key = $(el).text().replace(":", "").trim().toLowerCase().replace(/\s+/g, "_");
    const value = $(el).next("dd, span").text().trim();
    if (key && value) info[key] = value;
  });

  $(".info b, .comic-info b, .spe b").each((_, el) => {
    const key = $(el).text().replace(":", "").trim().toLowerCase().replace(/\s+/g, "_");
    const value = $(el).parent().text().replace($(el).text(), "").trim();
    if (key && value) info[key] = value;
  });

  return info;
}

// ─── Extract Slug dari URL ─────────────────────────────────────────────────────
function extractSlug(url = "") {
  if (!url) return "";
  return url.replace(/\/$/, "").split("/").filter(Boolean).pop() || "";
}

// ─── Normalize URL ─────────────────────────────────────────────────────────────
function normalizeURL(url = "") {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ─── Build Thumbnail URL dari slug ────────────────────────────────────────────
function getThumbnail(slug, imgSrc) {
  if (imgSrc && imgSrc.startsWith("http")) return imgSrc;
  if (slug) return `${THUMB_URL}/${slug}.jpg`;
  return null;
}

// ─── Get Server Timestamp ─────────────────────────────────────────────────────
function getTimestamp() {
  return new Date().toISOString();
}

module.exports = {
  fetchHTML,
  fetchHTMLByURL,
  fetchJSON,
  parseComicCards,
  parsePagination,
  parseChapterImages,
  parseComicInfo,
  extractSlug,
  normalizeURL,
  buildThumb,
  getThumbnail,
  getTimestamp,
  BASE_URL,
  THUMB_URL,
  API_BASE,
};
