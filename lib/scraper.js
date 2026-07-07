// lib/scraper.js — Animasu — Creator: matchadesu_
const axios      = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio    = require("cheerio");
const UserAgent  = require("user-agents");

const BASE_URL = "https://v1.animasu.work";

const client = axios.create({
  baseURL: BASE_URL, timeout: 15000,
  headers: {
    Accept:"text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language":"id-ID,id;q=0.9,en;q=0.7",
    "Accept-Encoding":"gzip, deflate, br",
    Connection:"keep-alive","Cache-Control":"no-cache",
    Referer: BASE_URL + "/",
    "Upgrade-Insecure-Requests":"1"
  }
});
axiosRetry(client,{ retries:3, retryDelay:axiosRetry.exponentialDelay,
  retryCondition:(e)=>axiosRetry.isNetworkOrIdempotentRequestError(e)||(e.response&&e.response.status>=500) });
client.interceptors.request.use((c)=>{ c.headers["User-Agent"]=new UserAgent({deviceCategory:"desktop"}).toString(); return c; });

async function fetchHTML(path="/"){
  const r=await client.get(path); return cheerio.load(r.data);
}
function parseAnimeCards($,sel=".animepost,.animpost"){
  const out=[];
  $(sel).each((_,el)=>{
    const $e=$(el);
    const title=$e.find(".tt h4,.title,h4").first().text().trim();
    const href =$e.find("a").first().attr("href")||"";
    const image=$e.find("img").first().attr("src")||$e.find("img").first().attr("data-src")||null;
    const ep   =$e.find(".epx,.epxs,.ep").first().text().trim()||null;
    const stat =$e.find(".type,.statusx").first().text().trim()||null;
    const rate =$e.find(".score,.rating,.eprating").first().text().trim()||null;
    if(title) out.push({ title, slug:extractSlug(href), url:href, image, episode:ep, status:stat, rating:rate });
  });
  return out;
}
function parseEpisodeList($){
  const out=[];
  $(".episodelist li,#episodelist li,.eplister ul li").each((_,el)=>{
    const t=$(el).find("a").text().trim();
    const h=$(el).find("a").attr("href")||"";
    const d=$(el).find(".epdate").text().trim();
    if(t) out.push({ title:t, slug:extractSlug(h), url:h, date:d||null });
  });
  return out;
}
function parsePagination($){
  const cur=$(".pagination .current,.page-numbers.current").first().text().trim();
  const pp=[]; $(".pagination a.page-numbers").each((_,e)=>{ const n=parseInt($(e).text()); if(!isNaN(n)) pp.push(n); });
  return {
    currentPage:parseInt(cur)||1, totalPages:pp.length?Math.max(...pp):1,
    nextPage:$(".pagination a.next").first().attr("href")||null,
    prevPage:$(".pagination a.prev").first().attr("href")||null
  };
}
function extractSlug(url=""){
  if(!url) return "";
  return url.replace(/\/$/,"").split("/").filter(Boolean).pop()||"";
}
module.exports = { fetchHTML, parseAnimeCards, parseEpisodeList, parsePagination, extractSlug, BASE_URL };
