// lib/scraper-nekopoi.js — Nekopoi — Creator: matchadesu_
const axios      = require("axios");
const axiosRetry = require("axios-retry").default;
const cheerio    = require("cheerio");
const UserAgent  = require("user-agents");

const BASE_URL = "https://nekopoi.care";
const client = axios.create({
  baseURL:BASE_URL, timeout:20000,
  headers:{
    Accept:"text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language":"id-ID,id;q=0.9,en;q=0.7",
    "Accept-Encoding":"gzip, deflate, br",
    Connection:"keep-alive", Referer:BASE_URL+"/",
    Origin:BASE_URL, DNT:"1",
    "Upgrade-Insecure-Requests":"1"
  }
});
axiosRetry(client,{ retries:4, retryDelay:(n)=>n*1500,
  retryCondition:(e)=>axiosRetry.isNetworkOrIdempotentRequestError(e)||[429,500,502,503,504].includes(e.response?.status) });
client.interceptors.request.use((c)=>{ c.headers["User-Agent"]=new UserAgent({deviceCategory:"desktop"}).toString(); return c; });

async function fetchHTML(path="/"){
  const r=await client.get(path); return cheerio.load(r.data);
}
function parseCards($,sel=".npost,article.post,.postcard"){
  const out=[];
  $(sel).each((_,el)=>{
    const $e=$(el);
    const title=$e.find(".ntitle a,h2.title a,.entry-title a,h2 a").first().text().trim()||$e.find("a").first().attr("title")||"";
    const href =$e.find(".ntitle a,h2.title a,.entry-title a,h2 a").first().attr("href")||$e.find("a").first().attr("href")||"";
    const image=$e.find("img").first().attr("src")||$e.find("img").first().attr("data-src")||null;
    const genre=[];
    $e.find("a[href*='/genre/']").each((_,g)=>{ const n=$(g).text().trim(); if(n) genre.push(n); });
    const date=$e.find(".date,time").first().text().trim()||null;
    if(title&&href) out.push({ title, slug:extractSlug(href), url:href, image, genre:genre.length?genre:null, date });
  });
  return out;
}
function parsePagination($){
  const cur=$(".pagination .current,.page-numbers.current").first().text().trim();
  const pp=[]; $(".pagination .page-numbers").each((_,e)=>{ const n=parseInt($(e).text()); if(!isNaN(n)) pp.push(n); });
  return {
    currentPage:parseInt(cur)||1, totalPages:pp.length?Math.max(...pp):1,
    nextPage:$("a.next.page-numbers").first().attr("href")||null,
    prevPage:$("a.prev.page-numbers").first().attr("href")||null
  };
}
function parseDownloadLinks($){
  const out=[];
  $(".download-episode,.episodedl,.dlbox,.download").each((_,box)=>{
    const epTitle=$(box).find("h3,h4,strong").first().text().trim();
    const quals=[];
    $(box).find("li,.mirror-link").each((_,row)=>{
      const q=$(row).find("strong,.quality").first().text().trim();
      const links=[];
      $(row).find("a").each((_,a)=>{
        const s=$(a).text().trim(), h=$(a).attr("href")||"";
        if(s&&h&&h!=="#") links.push({ server:s, url:h, size:null });
      });
      if(links.length) quals.push({ quality:q||"Unknown", links });
    });
    if(quals.length) out.push({ episode:epTitle||null, qualities:quals });
  });
  return out;
}
function parseVideoServers($){
  const servers=[], seen=new Set();
  $("select.mirror option,.mirrorselect option").each((_,el)=>{
    const name=$(el).text().trim(), val=$(el).attr("value")||"";
    if(name&&val&&!seen.has(val)){
      seen.add(val);
      let embed=val;
      try{ if(!/^https?:\/\//.test(val)) embed=Buffer.from(val,"base64").toString("utf-8"); }catch{}
      servers.push({ server:name, embed:embed.trim() });
    }
  });
  if(!servers.length){
    $("iframe[src],iframe[data-src]").each((_,el)=>{
      const src=$(el).attr("src")||$(el).attr("data-src")||"";
      if(src&&!seen.has(src)){ seen.add(src); servers.push({ server:"Default Player", embed:src }); }
    });
  }
  return servers;
}
function parseInfoTable($){
  const info={};
  $(".info-table td,.spe span,.infox span").each((_,el)=>{
    const text=$(el).text(), idx=text.indexOf(":");
    if(idx!==-1){
      const k=text.substring(0,idx).trim().toLowerCase().replace(/\s+/g,"_");
      const v=text.substring(idx+1).trim();
      if(k&&v) info[k]=v;
    }
  });
  return info;
}
function extractSlug(url=""){
  if(!url) return "";
  return url.replace(/\/$/,"").split("/").filter(Boolean).pop()||"";
}
module.exports = { fetchHTML, parseCards, parsePagination, parseDownloadLinks, parseVideoServers, parseInfoTable, extractSlug, BASE_URL };
