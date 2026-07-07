// routes/anime.js — Creator: matchadesu_
const router = require("express").Router();
const { fetchHTML, parseAnimeCards, parseEpisodeList, parsePagination, extractSlug, BASE_URL } = require("../lib/scraper");
const { sendSuccess, sendError } = require("../lib/response");
const wrap = (fn) => async (req,res) => { try{ await fn(req,res); }catch(e){ sendError(res,e.message,500); } };

router.get("/home", wrap(async(req,res)=>{
  const $=await fetchHTML("/");
  const featured=[], latestUpdate=parseAnimeCards($,".animepost,.animpost"), ongoing=[];
  $(".bigcontainer .bixbox,.slider .item").each((_,el)=>{
    const t=$(el).find("h2,h3,.titl").first().text().trim();
    const h=$(el).find("a").first().attr("href")||"";
    const i=$(el).find("img").first().attr("src")||"";
    const d=$(el).find("p,.desc").first().text().trim();
    if(t) featured.push({ title:t,image:i,url:h,description:d });
  });
  $(".serieslist.pop li,.ongoing .animepost").each((_,el)=>{
    const t=$(el).find("h2,h3,.title").first().text().trim();
    const h=$(el).find("a").first().attr("href")||"";
    const i=$(el).find("img").first().attr("src")||"";
    if(t) ongoing.push({ title:t,url:h,image:i });
  });
  sendSuccess(res,{ featured,latestUpdate,ongoing },"Berhasil mengambil data home Animasu");
}));

router.get("/popular", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/populer/page/"+page+"/":"/populer/");
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime populer");
}));

router.get("/movies", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/movie/page/"+page+"/":"/movie/");
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime movie");
}));

router.get("/ongoing", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/ongoing-anime/page/"+page+"/":"/ongoing-anime/");
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime ongoing");
}));

router.get("/completed", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/completed-anime/page/"+page+"/":"/completed-anime/");
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime completed");
}));

router.get("/latest", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/page/"+page+"/":"/");
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime terbaru");
}));

router.get("/animelist", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const letter=req.query.letter||"";
  let path=page>1?"/daftar-anime/page/"+page+"/":"/daftar-anime/";
  if(letter) path+="?letter="+letter.toUpperCase();
  const $=await fetchHTML(path);
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,letter:letter||"ALL",pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" daftar anime");
}));

router.get("/search/:keyword", wrap(async(req,res)=>{
  const kw=req.params.keyword;
  const page=parseInt(req.query.page)||1;
  if(!kw) return sendError(res,"Keyword tidak boleh kosong",400);
  const path=page>1?"/page/"+page+"/?s="+encodeURIComponent(kw):"/?s="+encodeURIComponent(kw);
  const $=await fetchHTML(path);
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada hasil untuk: \""+kw+"\"",404);
  sendSuccess(res,{ keyword:kw,page,pagination:parsePagination($),total:a.length,results:a },"Ditemukan "+a.length+" anime untuk: \""+kw+"\"");
}));

router.get("/advanced-search", wrap(async(req,res)=>{
  const { genre="",status="",type="",order="title",page="1",s="" }=req.query;
  const pn=parseInt(page)||1;
  const p=new URLSearchParams();
  if(s) p.set("s",s); if(genre) p.set("genre[]",genre);
  if(status) p.set("status",status); if(type) p.set("type",type); if(order) p.set("order",order);
  const path=pn>1?"/page/"+pn+"/?"+p.toString():"/?"+p.toString();
  const $=await fetchHTML(path);
  const a=parseAnimeCards($,".animepost,.animpost");
  sendSuccess(res,{ filters:{genre,status,type,order,keyword:s},page:pn,pagination:parsePagination($),total:a.length,results:a },"Ditemukan "+a.length+" anime");
}));

router.get("/genres", wrap(async(req,res)=>{
  let $; try{ $=await fetchHTML("/kumpulan-genre-anime-lengkap/"); }catch{ $=await fetchHTML("/"); }
  const genres=[];
  $("a[href*='/genre/']").each((_,el)=>{
    const name=$(el).text().trim(), href=$(el).attr("href")||"";
    const slug=href.replace(/\/$/,"").split("/genre/")[1]||"";
    if(name&&slug&&!genres.find((g)=>g.slug===slug)) genres.push({ name,slug,url:href });
  });
  sendSuccess(res,{ total:genres.length,genres },"Berhasil mengambil "+genres.length+" genre");
}));

router.get("/genre/:slug", wrap(async(req,res)=>{
  const { slug }=req.params; const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/genre/"+slug+"/page/"+page+"/":"/genre/"+slug+"/");
  const gn=$("h1.entry-title,.page-title,h1").first().text().trim()||slug;
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada anime untuk genre: "+slug,404);
  sendSuccess(res,{ genre:{name:gn,slug},page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime genre \""+gn+"\"");
}));

router.get("/characters", wrap(async(req,res)=>{
  let $; try{ $=await fetchHTML("/karakter/"); }catch{ $=await fetchHTML("/"); }
  const characters=[];
  $("a[href*='/karakter/']").each((_,el)=>{
    const name=$(el).text().trim(), href=$(el).attr("href")||"";
    const slug=href.replace(/\/$/,"").split("/karakter/")[1]||"";
    if(name&&slug&&!characters.find((c)=>c.slug===slug)) characters.push({ name,slug,url:href });
  });
  sendSuccess(res,{ total:characters.length,characters },"Berhasil mengambil "+characters.length+" karakter");
}));

router.get("/character/:slug", wrap(async(req,res)=>{
  const { slug }=req.params; const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/karakter/"+slug+"/page/"+page+"/":"/karakter/"+slug+"/");
  const cn=$("h1.entry-title,h1").first().text().trim()||slug;
  const a=parseAnimeCards($,".animepost,.animpost");
  if(!a.length) return sendError(res,"Tidak ada anime untuk karakter: "+slug,404);
  sendSuccess(res,{ character:{name:cn,slug},page,pagination:parsePagination($),total:a.length,results:a },"Berhasil mengambil "+a.length+" anime karakter \""+cn+"\"");
}));

router.get("/schedule", wrap(async(req,res)=>{
  const $=await fetchHTML("/jadwal/");
  const DAYS=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu","Acak"];
  const schedule={}; DAYS.forEach((d)=>{ schedule[d]=[]; });
  $(".jadwal-list,.bixbox").each((_,section)=>{
    const hdr=$(section).find("h2,h3,.schedule-day").first().text().trim();
    const md=DAYS.find((d)=>hdr.toLowerCase().includes(d.toLowerCase()));
    if(md){
      $(section).find("li,.item").each((_,item)=>{
        const t=$(item).find("a,h3").first().text().trim();
        const h=$(item).find("a").first().attr("href")||"";
        const tm=$(item).find(".time,.jam").first().text().trim();
        if(t) schedule[md].push({ title:t,url:h,time:tm||null });
      });
    }
  });
  const total=Object.values(schedule).reduce((s,a)=>s+a.length,0);
  sendSuccess(res,{ totalAnime:total,schedule },"Berhasil mengambil jadwal ("+total+" anime)");
}));

router.get("/detail/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  const $=await fetchHTML("/anime/"+slug+"/");
  const title=$("h1.entry-title,h1").first().text().trim();
  if(!title) return sendError(res,"Anime \""+slug+"\" tidak ditemukan",404);
  const image=$(".thumb img,.poster img").first().attr("src")||null;
  const synopsis=$(".entry-content p,.synp p").first().text().trim()||null;
  const rating=$(".num,.rating,.score").first().text().trim()||null;
  const genres=[]; $("a[href*='/genre/'],.genxed a").each((_,el)=>{ const n=$(el).text().trim(),h=$(el).attr("href")||""; if(n) genres.push({ name:n,url:h }); });
  const info={}; $(".spe span,.infox span").each((_,el)=>{ const text=$(el).text(),idx=text.indexOf(":"); if(idx!==-1){ const k=text.substring(0,idx).trim().toLowerCase().replace(/\s+/g,"_"),v=text.substring(idx+1).trim(); if(k&&v) info[k]=v; } });
  const episodes=parseEpisodeList($);
  sendSuccess(res,{ title,slug,url:BASE_URL+"/anime/"+slug+"/",image,synopsis,rating,genres,info,totalEpisodes:episodes.length,episodes },"Berhasil mengambil detail: "+title);
}));

router.get("/episode/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/episode/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"Episode \""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  const servers=[];
  $(".mirror option,.serverselect option").each((_,el)=>{ const n=$(el).text().trim(),v=$(el).attr("value")||""; if(n&&v) servers.push({ server:n,embed:v }); });
  if(!servers.length) $("iframe[src]").each((_,el)=>{ const s=$(el).attr("src")||""; if(s) servers.push({ server:"Default",embed:s }); });
  const prev=$(".navpre a,.prev-episode a").first().attr("href")||null;
  const next=$(".navnext a,.next-episode a").first().attr("href")||null;
  const downloads=[]; $(".download-eps li").each((_,el)=>{ const q=$(el).find("strong").first().text().trim(); const links=[]; $(el).find("a").each((_,a)=>{ const s=$(a).text().trim(),h=$(a).attr("href")||""; if(s&&h) links.push({ server:s,url:h }); }); if(links.length) downloads.push({ quality:q,links }); });
  sendSuccess(res,{ title,slug,url:BASE_URL+usedPath,servers:servers.length?servers:null,navigation:{ prevEpisode:prev,nextEpisode:next },downloads:downloads.length?downloads:null },"Berhasil mengambil episode: "+title);
}));

router.get("/download/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/anime/"+slug+"/","/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"\""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  const downloads=[]; $(".download-eps li").each((_,el)=>{ const q=$(el).find("strong").first().text().trim(); const links=[]; $(el).find("a").each((_,a)=>{ const s=$(a).text().trim(),h=$(a).attr("href")||""; if(s&&h) links.push({ server:s,url:h }); }); if(links.length) downloads.push({ quality:q,links }); });
  const batch=[]; $(".dlbatch a,.batchlink a").each((_,el)=>{ const l=$(el).text().trim(),h=$(el).attr("href")||""; if(l&&h) batch.push({ label:l,url:h }); });
  if(!downloads.length&&!batch.length) return sendError(res,"Tidak ada link download untuk: \""+slug+"\"",404);
  sendSuccess(res,{ title,slug,url:BASE_URL+usedPath,downloads:downloads.length?downloads:null,batch:batch.length?batch:null },"Berhasil mengambil download: "+title);
}));

module.exports = router;
