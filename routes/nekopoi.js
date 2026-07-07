// routes/nekopoi.js — Creator: matchadesu_
const router = require("express").Router();
const { fetchHTML, parseCards, parsePagination, parseDownloadLinks, parseVideoServers, parseInfoTable, extractSlug, BASE_URL } = require("../lib/scraper-nekopoi");
const { sendSuccess, sendError } = require("../lib/response");
const wrap = (fn) => async (req,res) => { try{ await fn(req,res); }catch(e){ sendError(res,e.message,500); } };
const SEL = ".npost,article.post,.postcard";

router.get("/home", wrap(async(req,res)=>{
  const $=await fetchHTML("/");
  const latest=parseCards($,SEL);
  const pop=[]; $(".widget .popularpost li,.popular-posts li").each((_,el)=>{ const t=$(el).find("a").first().text().trim(),h=$(el).find("a").first().attr("href")||""; if(t&&h) pop.push({ title:t,url:h }); });
  sendSuccess(res,{ latest:{ total:latest.length,results:latest },popular:pop.length?{ total:pop.length,results:pop }:null },"Berhasil mengambil home Nekopoi");
}));

router.get("/popular", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  let $,anime,pagination;
  for(const p of [page>1?"/populer/page/"+page+"/":"/populer/",page>1?"/?order=popular&page="+page:"/?order=popular"]){
    try{ $=await fetchHTML(p); anime=parseCards($,SEL); if(anime.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!anime?.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination,total:anime.length,results:anime },"Berhasil mengambil "+anime.length+" anime populer");
}));

router.get("/latest", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/page/"+page+"/":"/");
  const a=parseCards($,SEL);
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime terbaru");
}));

router.get("/ongoing", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  let $,anime,pagination;
  for(const p of [page>1?"/ongoing/page/"+page+"/":"/ongoing/",page>1?"/?status=ongoing&page="+page:"/?status=ongoing"]){
    try{ $=await fetchHTML(p); anime=parseCards($,SEL); if(anime.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!anime?.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination,total:anime.length,results:anime },"Berhasil mengambil "+anime.length+" anime ongoing");
}));

router.get("/completed", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  let $,anime,pagination;
  for(const p of [page>1?"/completed/page/"+page+"/":"/completed/",page>1?"/complete/page/"+page+"/":"/complete/"]){
    try{ $=await fetchHTML(p); anime=parseCards($,SEL); if(anime.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!anime?.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination,total:anime.length,results:anime },"Berhasil mengambil "+anime.length+" anime completed");
}));

router.get("/series", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  let $,series,pagination;
  for(const p of [page>1?"/series/page/"+page+"/":"/series/",page>1?"/daftar-anime/page/"+page+"/":"/daftar-anime/"]){
    try{ $=await fetchHTML(p); series=parseCards($,SEL); if(series.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!series?.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination,total:series.length,results:series },"Berhasil mengambil "+series.length+" series");
}));

router.get("/search/:keyword", wrap(async(req,res)=>{
  const kw=req.params.keyword; const page=parseInt(req.query.page)||1;
  if(!kw) return sendError(res,"Keyword tidak boleh kosong",400);
  const path=page>1?"/page/"+page+"/?s="+encodeURIComponent(kw):"/?s="+encodeURIComponent(kw);
  const $=await fetchHTML(path);
  const a=parseCards($,SEL);
  if(!a.length) return sendError(res,"Tidak ada hasil untuk: \""+kw+"\"",404);
  sendSuccess(res,{ keyword:kw,page,pagination:parsePagination($),total:a.length,results:a },"Ditemukan "+a.length+" hasil untuk: \""+kw+"\"");
}));

router.get("/advanced-search", wrap(async(req,res)=>{
  const { genre="",tag="",status="",order="",s="",page="1" }=req.query;
  const pn=parseInt(page)||1;
  const p=new URLSearchParams();
  if(s) p.set("s",s); if(genre) p.set("genre[]",genre); if(tag) p.set("tag[]",tag); if(status) p.set("status",status); if(order) p.set("order",order);
  const path=pn>1?"/page/"+pn+"/?"+p.toString():"/?"+p.toString();
  const $=await fetchHTML(path);
  const a=parseCards($,SEL);
  sendSuccess(res,{ filters:{genre,tag,status,order,keyword:s},page:pn,pagination:parsePagination($),total:a.length,results:a },"Ditemukan "+a.length+" anime");
}));

router.get("/genres", wrap(async(req,res)=>{
  const $=await fetchHTML("/");
  const genres=[];
  $("a[href*='/genre/']").each((_,el)=>{ const name=$(el).text().trim(),href=$(el).attr("href")||"",slug=href.replace(/\/$/,"").split("/genre/")[1]||""; if(name&&slug&&!genres.find((g)=>g.slug===slug)) genres.push({ name,slug,url:href }); });
  sendSuccess(res,{ total:genres.length,genres },"Berhasil mengambil "+genres.length+" genre");
}));

router.get("/genre/:slug", wrap(async(req,res)=>{
  const { slug }=req.params; const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/genre/"+slug+"/page/"+page+"/":"/genre/"+slug+"/");
  const gn=$("h1.entry-title,h1").first().text().trim()||slug;
  const a=parseCards($,SEL);
  if(!a.length) return sendError(res,"Tidak ada anime untuk genre: "+slug,404);
  sendSuccess(res,{ genre:{name:gn,slug},page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime genre \""+gn+"\"");
}));

router.get("/tags", wrap(async(req,res)=>{
  const $=await fetchHTML("/");
  const tags=[];
  $("a[href*='/tag/']").each((_,el)=>{ const name=$(el).text().trim(),href=$(el).attr("href")||"",slug=href.replace(/\/$/,"").split("/tag/")[1]||""; if(name&&slug&&!tags.find((t)=>t.slug===slug)) tags.push({ name,slug,url:href }); });
  sendSuccess(res,{ total:tags.length,tags },"Berhasil mengambil "+tags.length+" tag");
}));

router.get("/tag/:slug", wrap(async(req,res)=>{
  const { slug }=req.params; const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/tag/"+slug+"/page/"+page+"/":"/tag/"+slug+"/");
  const tn=$("h1.entry-title,h1").first().text().trim()||slug;
  const a=parseCards($,SEL);
  if(!a.length) return sendError(res,"Tidak ada konten untuk tag: "+slug,404);
  sendSuccess(res,{ tag:{name:tn,slug},page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" konten tag \""+tn+"\"");
}));

router.get("/schedule", wrap(async(req,res)=>{
  const DAYS=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu","TBA"];
  let $;
  for(const p of ["/jadwal/","/schedule/","/"]){ try{ $=await fetchHTML(p); break; }catch{ /* continue */ } }
  if(!$) return sendError(res,"Gagal mengambil jadwal",500);
  const schedule={}; DAYS.forEach((d)=>{ schedule[d]=[]; });
  $(".jadwal-list,.bixbox").each((_,section)=>{
    const hdr=$(section).find("h2,h3,.schedule-day").first().text().trim();
    const md=DAYS.find((d)=>hdr.toLowerCase().includes(d.toLowerCase()));
    if(md) $(section).find("li,.item").each((_,item)=>{ const t=$(item).find("a,h3").first().text().trim(),h=$(item).find("a").first().attr("href")||"",tm=$(item).find(".time,.jam").first().text().trim(); if(t) schedule[md].push({ title:t,url:h,time:tm||null }); });
  });
  const total=Object.values(schedule).reduce((s,a)=>s+a.length,0);
  sendSuccess(res,{ totalAnime:total,schedule },"Berhasil mengambil jadwal ("+total+" anime)");
}));

router.get("/series/:slug", wrap(async(req,res)=>{
  const { slug }=req.params; const page=parseInt(req.query.page)||1;
  let $,anime,pagination;
  for(const p of [page>1?"/series/"+slug+"/page/"+page+"/":"/series/"+slug+"/",page>1?"/anime/"+slug+"/page/"+page+"/":"/anime/"+slug+"/"]){
    try{ $=await fetchHTML(p); anime=parseCards($,SEL); if(anime.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!anime?.length) return sendError(res,"Tidak ada konten untuk series: "+slug,404);
  sendSuccess(res,{ series:{ slug },page,pagination,total:anime.length,results:anime },"Berhasil mengambil "+anime.length+" konten series");
}));

router.get("/detail/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/anime/"+slug+"/","/hentai/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"\""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  const image=$(".thumb img,.poster img").first().attr("src")||null;
  const synopsis=$(".entry-content p,.synp p").first().text().trim()||null;
  const info=parseInfoTable($);
  const genres=[]; $("a[href*='/genre/']").each((_,el)=>{ const n=$(el).text().trim(),h=$(el).attr("href")||""; if(n&&!genres.find((g)=>g.name===n)) genres.push({ name:n,url:h }); });
  const episodes=[]; $(".episodelist li,#episodelist li").each((_,el)=>{ const t=$(el).find("a").text().trim(),h=$(el).find("a").attr("href")||""; if(t&&h) episodes.push({ title:t,slug:extractSlug(h),url:h }); });
  const servers=parseVideoServers($);
  const downloads=parseDownloadLinks($);
  sendSuccess(res,{ title,slug,url:BASE_URL+usedPath,image,synopsis,genres,info,totalEpisodes:episodes.length,episodes:episodes.length?episodes:null,servers:servers.length?servers:null,downloads:downloads.length?downloads:null },"Berhasil mengambil detail: "+title);
}));

router.get("/episode/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/episode/"+slug+"/","/nonton/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"Episode \""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  const servers=parseVideoServers($);
  const downloads=parseDownloadLinks($);
  const prev=$(".navpre a,.prev-episode a").first().attr("href")||null;
  const next=$(".navnext a,.next-episode a").first().attr("href")||null;
  sendSuccess(res,{ title,slug,url:BASE_URL+usedPath,servers:servers.length?servers:null,downloads:downloads.length?downloads:null,navigation:{ prevEpisode:prev,nextEpisode:next } },"Berhasil mengambil episode: "+title);
}));

router.get("/download/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/anime/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"\""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  const downloads=parseDownloadLinks($);
  if(!downloads.length) return sendError(res,"Tidak ada download untuk: \""+slug+"\"",404);
  sendSuccess(res,{ title,slug,url:BASE_URL+usedPath,downloads },"Berhasil mengambil download: "+title);
}));

module.exports = router;
