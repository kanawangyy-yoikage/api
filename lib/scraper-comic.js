// lib/scraper-comic.js — Komiku — Creator: matchadesu_
const axios      = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio    = require("cheerio");
const UserAgent  = require("user-agents");

const BASE_URL  = "https://komiku.org";
const THUMB_URL = "https://thumbnail.komiku.org";

const client = axios.create({
  baseURL:BASE_URL, timeout:20000,
  headers:{
    Accept:"text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language":"id-ID,id;q=0.9,en;q=0.7",
    Referer:BASE_URL+"/","Upgrade-Insecure-Requests":"1"
  }
});
axiosRetry(client,{ retries:4, retryDelay:(n)=>n*1500,
  retryCondition:(e)=>axiosRetry.isNetworkOrIdempotentRequestError(e)||[429,500,502,503,504].includes(e.response?.status) });
client.interceptors.request.use((c)=>{ c.headers["User-Agent"]=new UserAgent({deviceCategory:"desktop"}).toString(); return c; });

async function fetchHTML(path="/"){
  const r=await client.get(path); return cheerio.load(r.data);
}
function parseComicCards($,sel=".bge,.bs,.bsx,article.post"){
  const out=[];
  $(sel).each((_,el)=>{
    const $e=$(el);
    const title=$e.find("h3 a,h2 a,.tt h2,.ntitle a").first().text().trim()||$e.find("a").first().attr("title")||"";
    const href =$e.find("h3 a,h2 a,.tt h2 a").first().attr("href")||$e.find("a").first().attr("href")||"";
    const image=$e.find("img").first().attr("src")||$e.find("img").first().attr("data-src")||null;
    const type =$e.find(".type,.sts,.typeflag").first().text().trim()||null;
    const lat  =$e.find(".lch a,.chapter a").first().text().trim()||null;
    const rat  =$e.find(".numscore,.rating").first().text().trim()||null;
    const stat =$e.find(".status,.sts").first().text().trim()||null;
    const slug =extractSlug(href);
    if(title&&href) out.push({
      title, slug,
      url: href.startsWith("http")?href:BASE_URL+href,
      thumbnail: image||(slug?THUMB_URL+"/"+slug+".jpg":null),
      type, latestChapter:lat, rating:rat, status:stat
    });
  });
  return out;
}
function parsePagination($){
  const cur=$(".pagination .current,.page-numbers.current").first().text().trim();
  const pp=[]; $(".pagination .page-numbers").each((_,e)=>{ const n=parseInt($(e).text()); if(!isNaN(n)) pp.push(n); });
  const max=pp.length?Math.max(...pp):1;
  return {
    currentPage:parseInt(cur)||1, totalPages:max,
    hasNextPage:!!$("a.next.page-numbers").first().attr("href"),
    hasPrevPage:!!$("a.prev.page-numbers").first().attr("href"),
    nextPage:$("a.next.page-numbers").first().attr("href")||null,
    prevPage:$("a.prev.page-numbers").first().attr("href")||null
  };
}
function parseChapterImages($){
  const imgs=[], seen=new Set();
  const sels=["#Baca_Komik img",".chapter-images img",".reading-content img",".page-break img"];
  for(const sel of sels){
    $(sel).each((i,el)=>{
      const src=$(el).attr("src")||$(el).attr("data-src")||$(el).attr("data-lazy-src")||"";
      if(src&&!seen.has(src)&&src.startsWith("http")){ seen.add(src); imgs.push({ page:i+1, url:src, width:null, height:null }); }
    });
    if(imgs.length) break;
  }
  return imgs;
}
function parseComicInfo($){
  const info={};
  $(".infotable tr").each((_,el)=>{
    const cells=$(el).find("td");
    if(cells.length>=2){
      const k=$(cells[0]).text().replace(":","").trim().toLowerCase().replace(/\s+/g,"_");
      const v=$(cells[1]).text().trim();
      if(k&&v) info[k]=v;
    }
  });
  $(".spe span,.infox span,.info b").each((_,el)=>{
    const text=$(el).text(), idx=text.indexOf(":");
    if(idx!==-1){
      const k=text.substring(0,idx).trim().toLowerCase().replace(/\s+/g,"_");
      const v=text.substring(idx+1).trim();
      if(k&&v&&!info[k]) info[k]=v;
    }
  });
  return info;
}
function extractSlug(url=""){
  if(!url) return "";
  return url.replace(/\/$/,"").split("/").filter(Boolean).pop()||"";
}
function getTimestamp(){ return new Date().toISOString(); }
module.exports = { fetchHTML, parseComicCards, parsePagination, parseChapterImages, parseComicInfo, extractSlug, getTimestamp, BASE_URL, THUMB_URL };
