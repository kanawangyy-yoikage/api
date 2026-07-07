// fix.js
// Jalankan di dalam folder matchadesu-api: node fix.js
const fs   = require("fs");
const path = require("path");

const files = [
  "lib/scraper.js",
  "lib/scraper-nekopoi.js",
  "lib/scraper-comic.js",
  "lib/scraper-novel.js",
  "lib/scraper-dramabox.js",
];

// Fix 1: axios-retry import
files.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    /const axiosRetry\s*=\s*require\(["']axios-retry["']\)\.default;/g,
    `const axiosRetryPkg = require("axios-retry");\nconst axiosRetry    = axiosRetryPkg.default || axiosRetryPkg;`
  );
  fs.writeFileSync(file, content, "utf8");
  console.log("✅ Fixed axios-retry import:", file);
});

// Fix 2: Update package.json
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.engines = { node: "24.x" };
pkg.dependencies = {
  axios        : "^1.7.9",
  "axios-retry": "^4.5.0",
  cheerio      : "^1.0.0",
  express      : "^4.21.2",
  "user-agents": "^1.1.239",
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2), "utf8");
console.log("✅ Fixed package.json");

// Fix 3: Update vercel.json
const vercel = {
  version: 2,
  name: "matchadesu-api",
  builds: [{ src: "api/index.js", use: "@vercel/node" }],
  functions: { "api/index.js": { maxDuration: 30 } },
  routes: [{ src: "/(.*)", dest: "/api/index.js" }],
  headers: [{
    source: "/(.*)",
    headers: [
      { key: "Access-Control-Allow-Origin",  value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-access-token, x-refresh-token, x-user-id" },
      { key: "X-Powered-By", value: "matchadesu_ REST API" },
      { key: "X-Creator",    value: "matchadesu_" },
      { key: "X-API-Version",value: "1.0.0" },
    ],
  }],
};
fs.writeFileSync("vercel.json", JSON.stringify(vercel, null, 2), "utf8");
console.log("✅ Fixed vercel.json");

// Fix 4: Tulis ulang api/index.js yang lebih aman
fs.mkdirSync("api", { recursive: true });
fs.writeFileSync("api/index.js", `// api/index.js
// Main Entry Point - Creator: matchadesu_
"use strict";

const express = require("express");
const app     = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token, x-refresh-token, x-user-id");
  res.setHeader("X-Creator",     "matchadesu_");
  res.setHeader("X-API-Version", "1.0.0");
  res.setHeader("X-Powered-By",  "matchadesu_ REST API");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path} -> \${res.statusCode} (\${Date.now()-start}ms)\`);
  });
  next();
});

// Timeout 25s
app.use((req, res, next) => {
  res.setTimeout(25000, () => {
    if (!res.headersSent) {
      res.status(503).json({
        status: "failed", creator: "matchadesu_",
        statusCode: 503, statusMessage: "Service Unavailable",
        message: "Request timeout (25s). Coba lagi.", ok: false, data: null,
      });
    }
  });
  next();
});

// Mount routes dengan error handling per router
function safeRoute(routePath, routeFile) {
  try {
    const router = require(routeFile);
    app.use(routePath, router);
    console.log(\`✅ Route mounted: \${routePath}\`);
  } catch (err) {
    console.error(\`❌ Failed to load route \${routePath}:\`, err.message);
    app.use(routePath, (req, res) => {
      res.status(500).json({
        status: "failed", creator: "matchadesu_",
        statusCode: 500, statusMessage: "Internal Server Error",
        message: \`Route \${routePath} gagal dimuat: \${err.message}\`,
        ok: false, data: null,
      });
    });
  }
}

safeRoute("/anime",    "../routes/anime");
safeRoute("/nekopoi",  "../routes/nekopoi");
safeRoute("/comic",    "../routes/comic");
safeRoute("/novel",    "../routes/novel");
safeRoute("/dramabox", "../routes/dramabox");

// Root
app.get("/", (req, res) => {
  res.json({
    status: "success", creator: "matchadesu_",
    statusCode: 200, statusMessage: "OK",
    message: "Selamat datang di matchadesu_ REST API 🎉",
    ok: true,
    data: {
      name: "matchadesu_ All-in-One REST API",
      version: "1.0.0",
      creator: "matchadesu_",
      node: process.version,
      uptime: process.uptime().toFixed(2) + "s",
      timestamp: new Date().toISOString(),
      endpoints: {
        anime    : "/anime/*",
        nekopoi  : "/nekopoi/*",
        comic    : "/comic/*",
        novel    : "/novel/*",
        dramabox : "/dramabox/*",
      },
      docs: {
        anime   : "/anime/home | /anime/popular | /anime/search/:kw | /anime/detail/:slug",
        nekopoi : "/nekopoi/home | /nekopoi/latest | /nekopoi/detail/:slug",
        comic   : "/comic/homepage | /comic/terbaru | /comic/search?q= | /comic/comic/:slug",
        novel   : "/novel/home | /novel/search?q= | /novel/chapters/:id",
        dramabox: "/dramabox/search?q= | /dramabox/latest | /dramabox/stream?id=",
      },
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    status: "failed", creator: "matchadesu_",
    statusCode: 404, statusMessage: "Not Found",
    message: \`Endpoint "\${req.method} \${req.path}" tidak ditemukan\`,
    ok: false,
    data: { available: ["/anime/*", "/nekopoi/*", "/comic/*", "/novel/*", "/dramabox/*"] },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Global Error:", err.message);
  if (!res.headersSent) {
    res.status(500).json({
      status: "failed", creator: "matchadesu_",
      statusCode: 500, statusMessage: "Internal Server Error",
      message: err.message || "Terjadi kesalahan internal",
      ok: false, data: null,
    });
  }
});

module.exports = app;
`, "utf8");
console.log("✅ Fixed api/index.js");

// Fix 5: Tulis ulang semua lib scraper dengan import yang benar
fs.writeFileSync("lib/scraper.js", `// lib/scraper.js — Animasu — Creator: matchadesu_
"use strict";
const axios          = require("axios");
const axiosRetryPkg  = require("axios-retry");
const axiosRetry     = axiosRetryPkg.default || axiosRetryPkg;
const cheerio        = require("cheerio");
const UserAgent      = require("user-agents");

const BASE_URL = "https://v1.animasu.work";

const client = axios.create({
  baseURL : BASE_URL,
  timeout : 15000,
  headers : {
    "Accept"          : "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language" : "id-ID,id;q=0.9,en;q=0.7",
    "Accept-Encoding" : "gzip, deflate, br",
    "Connection"      : "keep-alive",
    "Cache-Control"   : "no-cache",
    "Referer"         : BASE_URL + "/",
    "Upgrade-Insecure-Requests": "1",
  },
});

axiosRetry(client, {
  retries      : 3,
  retryDelay   : axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response && err.response.status >= 500),
});

client.interceptors.request.use((config) => {
  config.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
  return config;
});

async function fetchHTML(path = "/") {
  const response = await client.get(path);
  return cheerio.load(response.data);
}

function parseAnimeCards($, selector = ".animepost,.animpost") {
  const results = [];
  $(selector).each((_, el) => {
    const $e    = $(el);
    const title = $e.find(".tt h4,.title,h4").first().text().trim();
    const href  = $e.find("a").first().attr("href") || "";
    const image = $e.find("img").first().attr("src") || $e.find("img").first().attr("data-src") || null;
    const ep    = $e.find(".epx,.epxs,.ep").first().text().trim() || null;
    const stat  = $e.find(".type,.statusx").first().text().trim() || null;
    const rate  = $e.find(".score,.rating,.eprating").first().text().trim() || null;
    if (title) results.push({ title, slug: extractSlug(href), url: href, image, episode: ep, status: stat, rating: rate });
  });
  return results;
}

function parseEpisodeList($) {
  const episodes = [];
  $(".episodelist li,#episodelist li,.eplister ul li").each((_, el) => {
    const t = $(el).find("a").text().trim();
    const h = $(el).find("a").attr("href") || "";
    const d = $(el).find(".epdate").text().trim();
    if (t) episodes.push({ title: t, slug: extractSlug(h), url: h, date: d || null });
  });
  return episodes;
}

function parsePagination($) {
  const cur = $(".pagination .current,.page-numbers.current").first().text().trim();
  const pp  = [];
  $(".pagination a.page-numbers").each((_, e) => {
    const n = parseInt($(e).text());
    if (!isNaN(n)) pp.push(n);
  });
  return {
    currentPage: parseInt(cur) || 1,
    totalPages : pp.length ? Math.max(...pp) : 1,
    nextPage   : $(".pagination a.next").first().attr("href") || null,
    prevPage   : $(".pagination a.prev").first().attr("href") || null,
  };
}

function extractSlug(url = "") {
  if (!url) return "";
  return url.replace(/\\/$/, "").split("/").filter(Boolean).pop() || "";
}

module.exports = { fetchHTML, parseAnimeCards, parseEpisodeList, parsePagination, extractSlug, BASE_URL };
`, "utf8");
console.log("✅ Fixed lib/scraper.js");

fs.writeFileSync("lib/scraper-nekopoi.js", `// lib/scraper-nekopoi.js — Nekopoi — Creator: matchadesu_
"use strict";
const axios         = require("axios");
const axiosRetryPkg = require("axios-retry");
const axiosRetry    = axiosRetryPkg.default || axiosRetryPkg;
const cheerio       = require("cheerio");
const UserAgent     = require("user-agents");

const BASE_URL = "https://nekopoi.care";

const client = axios.create({
  baseURL : BASE_URL,
  timeout : 20000,
  headers : {
    "Accept"          : "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language" : "id-ID,id;q=0.9,en;q=0.7",
    "Accept-Encoding" : "gzip, deflate, br",
    "Connection"      : "keep-alive",
    "Referer"         : BASE_URL + "/",
    "Origin"          : BASE_URL,
    "DNT"             : "1",
    "Upgrade-Insecure-Requests": "1",
  },
});

axiosRetry(client, {
  retries      : 4,
  retryDelay   : (n) => n * 1500,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    [429, 500, 502, 503, 504].includes(err.response?.status),
});

client.interceptors.request.use((cfg) => {
  cfg.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
  return cfg;
});

async function fetchHTML(path = "/") {
  const res = await client.get(path);
  return cheerio.load(res.data);
}

function parseCards($, selector = ".npost,article.post,.postcard") {
  const results = [];
  $(selector).each((_, el) => {
    const $e    = $(el);
    const title = $e.find(".ntitle a,h2.title a,.entry-title a,h2 a").first().text().trim() || $e.find("a").first().attr("title") || "";
    const href  = $e.find(".ntitle a,h2.title a,.entry-title a,h2 a").first().attr("href") || $e.find("a").first().attr("href") || "";
    const image = $e.find("img").first().attr("src") || $e.find("img").first().attr("data-src") || null;
    const genre = [];
    $e.find("a[href*='/genre/']").each((_, g) => { const n = $(g).text().trim(); if (n) genre.push(n); });
    const date  = $e.find(".date,time").first().text().trim() || null;
    if (title && href) results.push({ title, slug: extractSlug(href), url: href, image, genre: genre.length ? genre : null, date });
  });
  return results;
}

function parsePagination($) {
  const cur = $(".pagination .current,.page-numbers.current").first().text().trim();
  const pp  = [];
  $(".pagination .page-numbers").each((_, e) => { const n = parseInt($(e).text()); if (!isNaN(n)) pp.push(n); });
  return {
    currentPage: parseInt(cur) || 1,
    totalPages : pp.length ? Math.max(...pp) : 1,
    nextPage   : $("a.next.page-numbers").first().attr("href") || null,
    prevPage   : $("a.prev.page-numbers").first().attr("href") || null,
  };
}

function parseDownloadLinks($) {
  const out = [];
  $(".download-episode,.episodedl,.dlbox,.download").each((_, box) => {
    const epTitle = $(box).find("h3,h4,strong").first().text().trim();
    const quals   = [];
    $(box).find("li,.mirror-link").each((_, row) => {
      const q     = $(row).find("strong,.quality").first().text().trim();
      const links = [];
      $(row).find("a").each((_, a) => {
        const s = $(a).text().trim(), h = $(a).attr("href") || "";
        if (s && h && h !== "#") links.push({ server: s, url: h, size: null });
      });
      if (links.length) quals.push({ quality: q || "Unknown", links });
    });
    if (quals.length) out.push({ episode: epTitle || null, qualities: quals });
  });
  return out;
}

function parseVideoServers($) {
  const servers = [], seen = new Set();
  $("select.mirror option,.mirrorselect option").each((_, el) => {
    const name = $(el).text().trim(), val = $(el).attr("value") || "";
    if (name && val && !seen.has(val)) {
      seen.add(val);
      let embed = val;
      try { if (!/^https?:\\/\\//.test(val)) embed = Buffer.from(val, "base64").toString("utf-8"); } catch {}
      servers.push({ server: name, embed: embed.trim() });
    }
  });
  if (!servers.length) {
    $("iframe[src],iframe[data-src]").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src && !seen.has(src)) { seen.add(src); servers.push({ server: "Default Player", embed: src }); }
    });
  }
  return servers;
}

function parseInfoTable($) {
  const info = {};
  $(".info-table td,.spe span,.infox span").each((_, el) => {
    const text = $(el).text(), idx = text.indexOf(":");
    if (idx !== -1) {
      const k = text.substring(0, idx).trim().toLowerCase().replace(/\\s+/g, "_");
      const v = text.substring(idx + 1).trim();
      if (k && v) info[k] = v;
    }
  });
  return info;
}

function extractSlug(url = "") {
  if (!url) return "";
  return url.replace(/\\/$/, "").split("/").filter(Boolean).pop() || "";
}

module.exports = { fetchHTML, parseCards, parsePagination, parseDownloadLinks, parseVideoServers, parseInfoTable, extractSlug, BASE_URL };
`, "utf8");
console.log("✅ Fixed lib/scraper-nekopoi.js");

fs.writeFileSync("lib/scraper-comic.js", `// lib/scraper-comic.js — Komiku — Creator: matchadesu_
"use strict";
const axios         = require("axios");
const axiosRetryPkg = require("axios-retry");
const axiosRetry    = axiosRetryPkg.default || axiosRetryPkg;
const cheerio       = require("cheerio");
const UserAgent     = require("user-agents");

const BASE_URL  = "https://komiku.org";
const THUMB_URL = "https://thumbnail.komiku.org";

const client = axios.create({
  baseURL : BASE_URL,
  timeout : 20000,
  headers : {
    "Accept"          : "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language" : "id-ID,id;q=0.9,en;q=0.7",
    "Referer"         : BASE_URL + "/",
    "Upgrade-Insecure-Requests": "1",
  },
});

axiosRetry(client, {
  retries      : 4,
  retryDelay   : (n) => n * 1500,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    [429, 500, 502, 503, 504].includes(err.response?.status),
});

client.interceptors.request.use((cfg) => {
  cfg.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
  return cfg;
});

async function fetchHTML(path = "/") {
  const res = await client.get(path);
  return cheerio.load(res.data);
}

function parseComicCards($, selector = ".bge,.bs,.bsx,article.post") {
  const results = [];
  $(selector).each((_, el) => {
    const $e    = $(el);
    const title = $e.find("h3 a,h2 a,.tt h2,.ntitle a").first().text().trim() || $e.find("a").first().attr("title") || "";
    const href  = $e.find("h3 a,h2 a,.tt h2 a").first().attr("href") || $e.find("a").first().attr("href") || "";
    const image = $e.find("img").first().attr("src") || $e.find("img").first().attr("data-src") || null;
    const type  = $e.find(".type,.sts,.typeflag").first().text().trim() || null;
    const lat   = $e.find(".lch a,.chapter a").first().text().trim() || null;
    const rat   = $e.find(".numscore,.rating").first().text().trim() || null;
    const stat  = $e.find(".status,.sts").first().text().trim() || null;
    const slug  = extractSlug(href);
    if (title && href) {
      results.push({
        title, slug,
        url       : href.startsWith("http") ? href : BASE_URL + href,
        thumbnail : image || (slug ? THUMB_URL + "/" + slug + ".jpg" : null),
        type, latestChapter: lat, rating: rat, status: stat,
      });
    }
  });
  return results;
}

function parsePagination($) {
  const cur = $(".pagination .current,.page-numbers.current").first().text().trim();
  const pp  = [];
  $(".pagination .page-numbers").each((_, e) => { const n = parseInt($(e).text()); if (!isNaN(n)) pp.push(n); });
  const max = pp.length ? Math.max(...pp) : 1;
  return {
    currentPage : parseInt(cur) || 1,
    totalPages  : max,
    hasNextPage : !!$("a.next.page-numbers").first().attr("href"),
    hasPrevPage : !!$("a.prev.page-numbers").first().attr("href"),
    nextPage    : $("a.next.page-numbers").first().attr("href") || null,
    prevPage    : $("a.prev.page-numbers").first().attr("href") || null,
  };
}

function parseChapterImages($) {
  const imgs = [], seen = new Set();
  const sels = ["#Baca_Komik img", ".chapter-images img", ".reading-content img", ".page-break img"];
  for (const sel of sels) {
    $(sel).each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
      if (src && !seen.has(src) && src.startsWith("http")) {
        seen.add(src);
        imgs.push({ page: i + 1, url: src, width: null, height: null });
      }
    });
    if (imgs.length) break;
  }
  return imgs;
}

function parseComicInfo($) {
  const info = {};
  $(".infotable tr").each((_, el) => {
    const cells = $(el).find("td");
    if (cells.length >= 2) {
      const k = $(cells[0]).text().replace(":", "").trim().toLowerCase().replace(/\\s+/g, "_");
      const v = $(cells[1]).text().trim();
      if (k && v) info[k] = v;
    }
  });
  $(".spe span,.infox span,.info b").each((_, el) => {
    const text = $(el).text(), idx = text.indexOf(":");
    if (idx !== -1) {
      const k = text.substring(0, idx).trim().toLowerCase().replace(/\\s+/g, "_");
      const v = text.substring(idx + 1).trim();
      if (k && v && !info[k]) info[k] = v;
    }
  });
  return info;
}

function extractSlug(url = "") {
  if (!url) return "";
  return url.replace(/\\/$/, "").split("/").filter(Boolean).pop() || "";
}

function getTimestamp() { return new Date().toISOString(); }

module.exports = { fetchHTML, parseComicCards, parsePagination, parseChapterImages, parseComicInfo, extractSlug, getTimestamp, BASE_URL, THUMB_URL };
`, "utf8");
console.log("✅ Fixed lib/scraper-comic.js");

fs.writeFileSync("lib/scraper-novel.js", `// lib/scraper-novel.js — NovelHub — Creator: matchadesu_
"use strict";
const axios         = require("axios");
const axiosRetryPkg = require("axios-retry");
const axiosRetry    = axiosRetryPkg.default || axiosRetryPkg;
const UserAgent     = require("user-agents");

const BASE_CDN = "https://nacdn.novelhubapp.com";
const BASE_APP = "https://novelhubapp.com";
const BASE_ALT = "https://api.novelhubapp.com";

const ENDPOINTS = {
  HOME        : "/api/home",
  HOME_V2     : "/api/v2/home",
  SEARCH      : "/api/search",
  SEARCH_V2   : "/api/v2/search",
  HOT_SEARCH  : "/api/hot-search",
  HOT_SEARCH_V2:"/api/v2/hot-search",
  GENRE_LIST  : "/api/genre",
  GENRE_NOVEL : "/api/genre/novel",
  CHAPTERS    : "/api/chapters",
  CHAPTER_LIST: "/api/chapter-list",
};

function makeClient(baseURL) {
  const c = axios.create({
    baseURL,
    timeout : 20000,
    headers : {
      "Accept"           : "application/json,text/plain,*/*",
      "Content-Type"     : "application/json",
      "Accept-Language"  : "id-ID,id;q=0.9,en;q=0.7",
      "Origin"           : BASE_APP,
      "Referer"          : BASE_APP + "/",
      "X-Requested-With" : "XMLHttpRequest",
    },
  });
  axiosRetry(c, {
    retries      : 4,
    retryDelay   : (n) => n * 1500,
    retryCondition: (err) =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) ||
      [429, 500, 502, 503, 504].includes(err.response?.status),
  });
  c.interceptors.request.use((cfg) => {
    cfg.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
    return cfg;
  });
  return c;
}

const cdnClient = makeClient(BASE_CDN);
const apiClient = makeClient(BASE_ALT);

async function fetchCDN(path, params = {}) { return (await cdnClient.get(path, { params })).data; }
async function fetchAPI(path, params = {}) { return (await apiClient.get(path, { params })).data; }
async function fetchURL(url, params = {}) {
  try {
    const u = new URL(url);
    const c = makeClient(u.origin);
    return (await c.get(u.pathname + (u.search || ""), { params })).data;
  } catch (e) {
    throw new Error("fetchURL gagal: " + e.message);
  }
}

async function tryMultiEndpoint(targets) {
  const errors = [];
  for (const { fn, label } of targets) {
    try {
      const data = await fn();
      if (data != null) return { data, source: label };
    } catch (e) {
      errors.push("[" + label + "]: " + e.message);
    }
  }
  throw new Error("Semua endpoint gagal:\\n" + errors.join("\\n"));
}

function normalizeNovel(raw) {
  if (!raw) return null;
  const cover = raw.cover || raw.coverUrl || raw.cover_url || raw.image || null;
  return {
    id           : raw.id || raw.novel_id || raw.bookId || null,
    title        : raw.title || raw.name || raw.bookName || raw.novel_name || "Unknown",
    cover        : cover && typeof cover === "string" && cover.startsWith("http") ? cover : cover ? BASE_CDN + cover : null,
    author       : raw.author || raw.author_name || null,
    description  : raw.description || raw.desc || raw.intro || raw.synopsis || null,
    status       : raw.status || null,
    genres       : Array.isArray(raw.genre) ? raw.genre.map((g) => typeof g === "string" ? g : g.name || "").filter(Boolean) : [],
    rating       : raw.rating || raw.score || null,
    views        : raw.views || raw.view_count || null,
    totalChapters: raw.totalChapters || raw.total_chapters || raw.chapterCount || null,
    latestChapter: raw.lastChapter || raw.latest_chapter || null,
    updatedAt    : raw.updatedAt || raw.updated_at || raw.update_time || null,
    language     : raw.language || "ID",
    source       : BASE_CDN,
  };
}

function normalizeGenreObj(raw) {
  if (!raw) return null;
  return {
    id   : raw.id || raw.genre_id || null,
    name : raw.name || raw.genre_name || raw.label || "Unknown",
    slug : raw.slug || raw.code || null,
    icon : raw.icon || raw.image || null,
    count: raw.count || null,
  };
}

function normalizeChapterList(rawList) {
  if (!rawList) return [];
  const arr = Array.isArray(rawList) ? rawList : rawList.list || rawList.chapters || rawList.data || [];
  return arr.map((ch, i) => ({
    id       : ch.id || ch.chapter_id || i + 1,
    title    : ch.title || ch.chapter_title || ch.name || ("Chapter " + (i + 1)),
    number   : ch.number || ch.chapter_no || i + 1,
    url      : ch.url || ch.link || null,
    isPremium: ch.isPremium || ch.is_premium || false,
    isLocked : ch.isLocked || ch.is_locked || false,
    views    : ch.views || ch.view_count || null,
    date     : ch.date || ch.updated_at || ch.create_time || null,
  }));
}

function normalizeChapter(raw) {
  if (!raw) return null;
  if (typeof raw === "string" || typeof raw === "number") return { id: null, title: String(raw), number: null };
  return { id: raw.id || null, title: raw.title || raw.chapter_title || null, number: raw.number || raw.chapter_no || null, url: raw.url || null, date: raw.date || null };
}

function getTimestamp() { return new Date().toISOString(); }

module.exports = { fetchCDN, fetchAPI, fetchURL, tryMultiEndpoint, normalizeNovel, normalizeGenreObj, normalizeChapterList, normalizeChapter, getTimestamp, ENDPOINTS, BASE_CDN, BASE_APP, BASE_ALT };
`, "utf8");
console.log("✅ Fixed lib/scraper-novel.js");

fs.writeFileSync("lib/scraper-dramabox.js", `// lib/scraper-dramabox.js — DramaBox — Creator: matchadesu_
"use strict";
const axios         = require("axios");
const axiosRetryPkg = require("axios-retry");
const axiosRetry    = axiosRetryPkg.default || axiosRetryPkg;
const UserAgent     = require("user-agents");

const BASE_WEB    = "https://dramabox.com";
const BASE_API    = "https://dramabox.com/api";
const BASE_API_V1 = "https://dramabox.com/api/v1";
const BASE_API_V2 = "https://dramabox.com/api/v2";
const BASE_CDN    = "https://cdn.dramabox.com";

const ENDPOINTS = {
  AUTH_GUEST    : "/user/guest-login",
  AUTH_REFRESH  : "/user/token-refresh",
  HOME          : "/home",
  LATEST        : "/drama/latest",
  TRENDING      : "/drama/trending",
  HOT           : "/drama/hot",
  POPULAR       : "/drama/popular",
  RANK          : "/drama/rank",
  NEW_RELEASE   : "/drama/new-release",
  SEARCH        : "/search",
  SEARCH_V2     : "/search/drama",
  DETAIL        : "/drama/detail",
  EPISODES      : "/drama/episodes",
  EPISODE_LIST  : "/episode/list",
  EPISODE_DETAIL: "/episode/detail",
  STREAM        : "/episode/stream",
  STREAM_V2     : "/stream/url",
  PLAY_URL      : "/episode/play",
  VIDEO_INFO    : "/video/info",
  SOURCE        : "/episode/source",
};

function generateDeviceId() {
  const c = "abcdef0123456789"; let id = "";
  for (let i = 0; i < 32; i++) id += c[Math.floor(Math.random() * c.length)];
  return id.slice(0,8)+"-"+id.slice(8,12)+"-"+id.slice(12,16)+"-"+id.slice(16,20)+"-"+id.slice(20);
}

const tokenStore = {
  accessToken : null, refreshToken: null,
  expiresAt   : null, deviceId    : generateDeviceId(), userId: null,
};

function getDefaultHeaders(withAuth = false) {
  const h = {
    "Accept"          : "application/json,text/plain,*/*",
    "Content-Type"    : "application/json",
    "Accept-Language" : "en-US,en;q=0.9,id;q=0.8",
    "User-Agent"      : new UserAgent({ deviceCategory: "desktop" }).toString(),
    "Referer"         : BASE_WEB + "/",
    "Origin"          : BASE_WEB,
    "X-Device-Id"     : tokenStore.deviceId,
    "X-Platform"      : "web",
    "X-App-Version"   : "1.0.0",
    "X-Region"        : "ID",
    "X-Language"      : "id",
  };
  if (withAuth && tokenStore.accessToken) {
    h["Authorization"]  = "Bearer " + tokenStore.accessToken;
    h["X-Access-Token"] = tokenStore.accessToken;
  }
  return h;
}

function createClient(baseURL, withAuth = false) {
  const c = axios.create({ baseURL, timeout: 25000, maxRedirects: 5, headers: getDefaultHeaders(withAuth) });
  axiosRetry(c, {
    retries      : 4,
    retryDelay   : (n) => n * 2000,
    retryCondition: (err) =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) ||
      [429, 500, 502, 503, 504].includes(err.response?.status),
  });
  c.interceptors.request.use((cfg) => {
    cfg.headers["User-Agent"] = new UserAgent({ deviceCategory: "desktop" }).toString();
    return cfg;
  });
  return c;
}

async function guestLogin() {
  const payload = { deviceId: tokenStore.deviceId, device_id: tokenStore.deviceId, platform: "web", language: "id", region: "ID" };
  const eps     = [[BASE_API_V1, ENDPOINTS.AUTH_GUEST], [BASE_API_V2, ENDPOINTS.AUTH_GUEST], [BASE_API_V1, "/auth/guest"]];
  for (const [base, path] of eps) {
    try {
      const res   = await createClient(base, false).post(path, payload);
      const data  = res.data?.data || res.data?.result || res.data || {};
      const token = data.accessToken || data.access_token || data.token || null;
      if (token) {
        tokenStore.accessToken  = token;
        tokenStore.refreshToken = data.refreshToken || data.refresh_token || null;
        tokenStore.expiresAt    = Date.now() + ((data.expiresIn || 3600) * 1000);
        tokenStore.userId       = data.userId || null;
        return token;
      }
    } catch { /* continue */ }
  }
  return null;
}

async function refreshAccessToken(refreshToken) {
  const payload = { refreshToken, refresh_token: refreshToken, deviceId: tokenStore.deviceId };
  for (const base of [BASE_API_V1, BASE_API_V2]) {
    try {
      const res  = await createClient(base, false).post(ENDPOINTS.AUTH_REFRESH, payload);
      const data = res.data?.data || res.data?.result || res.data || {};
      const tok  = data.accessToken || data.access_token || data.token || null;
      if (tok) {
        tokenStore.accessToken  = tok;
        tokenStore.refreshToken = data.refreshToken || data.refresh_token || refreshToken;
        tokenStore.expiresAt    = Date.now() + ((data.expiresIn || 3600) * 1000);
        return { accessToken: tok, refreshToken: tokenStore.refreshToken, expiresAt: tokenStore.expiresAt };
      }
    } catch { /* continue */ }
  }
  throw new Error("Gagal refresh token");
}

async function ensureToken() {
  if (tokenStore.accessToken && tokenStore.expiresAt && Date.now() < tokenStore.expiresAt - 60000) return tokenStore.accessToken;
  if (tokenStore.refreshToken) {
    try { const r = await refreshAccessToken(tokenStore.refreshToken); if (r?.accessToken) return r.accessToken; } catch {}
  }
  return await guestLogin();
}

async function tryEndpoints(targets) {
  const errors = [];
  for (const { label, fn } of targets) {
    try { const data = await fn(); if (data != null) return { data, source: label }; }
    catch (e) { errors.push("[" + label + "]: " + e.message); }
  }
  throw new Error("Semua endpoint gagal:\\n" + errors.join("\\n"));
}

async function fetchWithAuth(path, params = {}, method = "GET", body = null) {
  await ensureToken();
  const c   = createClient(BASE_API_V1, true);
  const cfg = { params, headers: getDefaultHeaders(true) };
  if (method === "POST") return (await c.post(path, body || params, cfg)).data;
  return (await c.get(path, cfg)).data;
}

async function fetchPublic(baseURL, path, params = {}) {
  return (await createClient(baseURL, false).get(path, { params })).data;
}

function normalizeDrama(raw) {
  if (!raw) return null;
  const cover = raw.cover || raw.coverUrl || raw.poster || null;
  return {
    id           : raw.id || raw.drama_id || raw.seriesId || null,
    title        : raw.title || raw.name || raw.dramaName || "Unknown",
    cover        : cover && typeof cover === "string" && cover.startsWith("http") ? cover : cover ? BASE_CDN + cover : null,
    description  : raw.description || raw.desc || raw.intro || null,
    genre        : Array.isArray(raw.genre) ? raw.genre.map((g) => typeof g === "string" ? g : g.name || "").filter(Boolean) : typeof raw.genre === "string" ? raw.genre.split(",").map((g) => g.trim()) : [],
    country      : raw.country || raw.nation || null,
    language     : raw.language || raw.lang || null,
    year         : raw.year || raw.releaseYear || null,
    status       : raw.status || null,
    totalEpisodes: raw.totalEpisodes || raw.total_episodes || raw.episodeCount || null,
    latestEpisode: raw.latestEpisode || raw.latest_episode || null,
    rating       : raw.rating || raw.score || null,
    views        : raw.views || raw.viewCount || null,
    isFree       : raw.isFree ?? raw.is_free ?? null,
    isHot        : raw.isHot  ?? raw.is_hot  ?? null,
    cast         : Array.isArray(raw.cast) ? raw.cast.map((c) => typeof c === "string" ? { name: c, role: null } : { name: c.name || null, role: c.role || null }) : [],
    updatedAt    : raw.updatedAt || raw.updated_at || null,
    source       : BASE_WEB,
  };
}

function normalizeEpisode(raw) {
  if (!raw) return null;
  return {
    id         : raw.id || raw.episode_id || null,
    dramaId    : raw.dramaId || raw.drama_id || null,
    title      : raw.title || raw.episodeTitle || raw.name || null,
    number     : parseFloat(raw.number || raw.episodeNumber || raw.ep || 0) || null,
    cover      : raw.cover && typeof raw.cover === "string" && raw.cover.startsWith("http") ? raw.cover : raw.thumbnail || null,
    duration   : raw.duration || null,
    isFree     : raw.isFree  ?? raw.is_free  ?? null,
    isLocked   : raw.isLocked ?? raw.is_locked ?? null,
    isPremium  : raw.isPremium ?? raw.is_premium ?? null,
    views      : raw.views || null,
    publishDate: raw.publishDate || raw.date || null,
  };
}

function normalizeStreamSource(raw) {
  if (!raw) return null;
  return {
    url      : raw.url || raw.streamUrl || raw.playUrl || raw.src || null,
    quality  : raw.quality || raw.resolution || raw.definition || null,
    format   : raw.format || raw.type || "video/mp4",
    expires  : raw.expires || raw.expireTime || null,
    subtitles: Array.isArray(raw.subtitles) ? raw.subtitles.map((s) => ({ language: s.language || s.lang || null, label: s.label || s.name || null, url: s.url || s.src || null, format: s.format || "srt" })).filter((s) => s.url) : null,
    drm      : raw.drm || null,
    cdn      : raw.cdn || null,
  };
}

function normalizePagination(raw, page, limit) {
  const total      = raw?.total || raw?.totalCount || raw?.total_count || 0;
  const totalPages = raw?.totalPages || raw?.total_pages || Math.ceil(total / limit) || 1;
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1, nextPage: page < totalPages ? page + 1 : null, prevPage: page > 1 ? page - 1 : null };
}

function getTokenStore() {
  return {
    hasToken  : !!tokenStore.accessToken,
    hasRefresh: !!tokenStore.refreshToken,
    expiresAt : tokenStore.expiresAt,
    deviceId  : tokenStore.deviceId,
    userId    : tokenStore.userId,
    isExpired : tokenStore.expiresAt ? Date.now() >= (tokenStore.expiresAt - 60000) : true,
  };
}

function getTimestamp() { return new Date().toISOString(); }

module.exports = { fetchWithAuth, fetchPublic, tryEndpoints, ensureToken, guestLogin, refreshAccessToken, createClient, normalizeDrama, normalizeEpisode, normalizeStreamSource, normalizePagination, getTokenStore, getTimestamp, generateDeviceId, ENDPOINTS, BASE_WEB, BASE_API, BASE_API_V1, BASE_API_V2, BASE_CDN, tokenStore };
`, "utf8");
console.log("✅ Fixed lib/scraper-dramabox.js");

// Fix 6: Update lib/response.js
fs.writeFileSync("lib/response.js", `// lib/response.js — Creator: matchadesu_
"use strict";
const HTTP = {
  200:"OK",201:"Created",400:"Bad Request",401:"Unauthorized",
  403:"Forbidden",404:"Not Found",405:"Method Not Allowed",
  409:"Conflict",429:"Too Many Requests",
  500:"Internal Server Error",503:"Service Unavailable",
};
function sendSuccess(res, data, message = "Request berhasil", code = 200) {
  return res.status(code).json({ status:"success", creator:"matchadesu_", statusCode:code, statusMessage:HTTP[code]||"OK", message, ok:true, data });
}
function sendError(res, message = "Terjadi kesalahan", code = 500, data = null) {
  return res.status(code).json({ status:"failed", creator:"matchadesu_", statusCode:code, statusMessage:HTTP[code]||"Error", message, ok:false, data });
}
module.exports = { sendSuccess, sendError };
`, "utf8");
console.log("✅ Fixed lib/response.js");

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Semua file berhasil di-fix!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jalankan sekarang:

  npm install
  vercel --prod
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
