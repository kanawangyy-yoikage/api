// routes/comic.js — Creator: matchadesu_
const router = require("express").Router();
const { fetchHTML, parseComicCards, parsePagination, parseChapterImages, parseComicInfo, extractSlug, getTimestamp, BASE_URL, THUMB_URL } = require("../lib/scraper-comic");
const { sendSuccess, sendError } = require("../lib/response");
const wrap = (fn) => async (req,res) => { try{ await fn(req,res); }catch(e){ sendError(res,e.message,500); } };
const SEL = ".bge,.bs,.bsx,article.post";

router.get("/docs", wrap(async(req,res)=>{
  sendSuccess(res,{
    name:"Komiku REST API",version:"1.0.0",creator:"matchadesu_",
    source:BASE_URL,thumbnail:THUMB_URL,
    endpoints:{
      docs:"GET /comic/docs",health:"GET /comic/health",stats:"GET /comic/stats",
      homepage:"GET /comic/homepage",terbaru:"GET /comic/terbaru",populer:"GET /comic/populer",
      trending:"GET /comic/trending",random:"GET /comic/random",browse:"GET /comic/browse",
      genres:"GET /comic/genres",genre:"GET /comic/genre/:genre",type:"GET /comic/type/:type",
      berwarna:"GET /comic/berwarna/:page",pustaka:"GET /comic/pustaka/:page",
      search:"GET /comic/search?q=",advancedSearch:"GET /comic/advanced-search",
      recommendations:"GET /comic/recommendations",scroll:"GET /comic/scroll",
      infinite:"GET /comic/infinite",favorites:"GET /comic/favorites",
      detail:"GET /comic/comic/:slug",chapter:"GET /comic/chapter/:slug",
      navigation:"GET /comic/chapter/:slug/navigation"
    }
  },"Dokumentasi API Komiku by matchadesu_");
}));

router.get("/health", wrap(async(req,res)=>{
  const s=Date.now();
  let status="up", err=null;
  try{ await fetchHTML("/"); }catch(e){ status="down"; err=e.message; }
  const mem=process.memoryUsage();
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s,
    uptime:process.uptime().toFixed(2)+"s", node:process.version,
    checks:{
      komiku:{ status,error:err||undefined },
      memory:{ status:"ok", heapUsedMB:(mem.heapUsed/1024/1024).toFixed(2), heapTotalMB:(mem.heapTotal/1024/1024).toFixed(2) }
    }
  }, status==="up"?"Semua sistem berjalan normal ✅":"Layanan mengalami gangguan ⚠️");
}));

router.get("/stats", wrap(async(req,res)=>{
  const s=Date.now(); const $=await fetchHTML("/");
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source:BASE_URL,
    api:{ totalEndpoints:27, version:"1.0.0", creator:"matchadesu_", uptime:process.uptime().toFixed(2)+"s", nodeVersion:process.version, memoryUsageMB:(process.memoryUsage().heapUsed/1024/1024).toFixed(2) }
  },"Statistik API Komiku");
}));

router.get("/fullstats", wrap(async(req,res)=>{
  const s=Date.now();
  const [$h,$p,$t]=await Promise.all([fetchHTML("/"),fetchHTML("/komik/?orderby=popular"),fetchHTML("/komik/")]);
  const tpEl=$t(".pagination .page-numbers:not(.next):not(.prev)").last().text();
  const tp=parseInt(tpEl)||1; const ti=$t(SEL).length;
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s,
    fullStats:{
      database:{ estimatedTotalComics:tp*ti||"10.000+", comicsPerPage:ti||12, estimatedTotalPages:tp },
      content:{ homepageItems:$h(SEL).length, populerItems:$p(SEL).length, terbaruItems:ti, supportedTypes:["Manga","Manhwa","Manhua","Webtoon","Novel"] },
      sources:{ main:BASE_URL, thumbnail:THUMB_URL },
      api:{ version:"1.0.0", creator:"matchadesu_", totalEndpoints:27 }
    }
  },"Full statistik Komiku API");
}));

router.get("/comparison", wrap(async(req,res)=>{
  const s=Date.now();
  const bench=await Promise.allSettled([
    (async()=>{ const t=Date.now(); await fetchHTML("/"); return { endpoint:"/",ms:Date.now()-t,status:"ok" }; })(),
    (async()=>{ const t=Date.now(); await fetchHTML("/komik/"); return { endpoint:"/komik/",ms:Date.now()-t,status:"ok" }; })()
  ]);
  const res2=bench.map((b,i)=>b.status==="fulfilled"?b.value:{ endpoint:["home","komik"][i],ms:null,status:"error",error:b.reason?.message });
  const ok=res2.filter((r)=>r.ms!==null);
  const avg=ok.length?Math.round(ok.reduce((s,r)=>s+r.ms,0)/ok.length):null;
  sendSuccess(res,{
    timestamp:getTimestamp(), totalTimeMs:Date.now()-s, averageMs:avg, benchmarks:res2,
    performance:{ rating:avg<1000?"Excellent ⚡":avg<2000?"Good ✅":avg<4000?"Average ⚠️":"Slow 🐢", avgMs:avg, source:BASE_URL }
  },"Performance comparison selesai");
}));

router.get("/analytics", wrap(async(req,res)=>{
  const s=Date.now();
  const [$h,$p]=await Promise.all([fetchHTML("/"),fetchHTML("/komik/?orderby=popular")]);
  const hc=parseComicCards($h,SEL), pc=parseComicCards($p,SEL);
  const typeCount={};
  [...hc,...pc].forEach((c)=>{ const t=(c.type||"Unknown").toLowerCase(); typeCount[t]=(typeCount[t]||0)+1; });
  const gf={}; $h("a[href*='/genre/']").each((_,el)=>{ const n=$h(el).text().trim(); if(n) gf[n]=(gf[n]||0)+1; });
  const topGenres=Object.entries(gf).sort(([,a],[,b])=>b-a).slice(0,10).map(([name,frequency])=>({ name,frequency }));
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s,
    analytics:{
      homepage:{ totalItems:hc.length,withRating:hc.filter((c)=>c.rating).length },
      popular:{ totalItems:pc.length, topRated:pc.filter((c)=>c.rating).sort((a,b)=>parseFloat(b.rating||0)-parseFloat(a.rating||0)).slice(0,5).map((c)=>({ title:c.title,rating:c.rating,slug:c.slug })) },
      typeDistribution:typeCount, topGenres,
      summary:{ totalAnalyzed:hc.length+pc.length, uniqueTypes:Object.keys(typeCount).length, uniqueGenres:Object.keys(gf).length, analysisTimeMs:Date.now()-s }
    }
  },"Analytics Komiku berhasil diproses");
}));

router.get("/homepage", wrap(async(req,res)=>{
  const s=Date.now(); const $=await fetchHTML("/");
  const latestUpdate=parseComicCards($,SEL);
  const pop=[]; $(".widget .popular-posts li,.sidebar .komik-item,.serieslist.pop li").each((_,el)=>{ const t=$(el).find("a").first().text().trim(),h=$(el).find("a").first().attr("href")||"",i=$(el).find("img").attr("src")||null; if(t&&h) pop.push({ title:t,url:h,image:i }); });
  const navGenres=[]; $("nav a[href*='/genre/'],.nav-genre a").each((_,el)=>{ const n=$(el).text().trim(),h=$(el).attr("href")||"",slug=h.replace(/\/$/,"").split("/genre/")[1]||""; if(n&&slug&&!navGenres.find((g)=>g.slug===slug)) navGenres.push({ name:n,slug,url:h }); });
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s,
    latestUpdate:{ total:latestUpdate.length, results:latestUpdate },
    popular:pop.length?{ total:pop.length,results:pop }:null,
    navGenres:navGenres.length?navGenres:null
  },"Berhasil mengambil homepage Komiku ("+latestUpdate.length+" komik)");
}));

router.get("/unlimited", wrap(async(req,res)=>{
  const s=Date.now();
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||50,100);
  const order=req.query.order||"update";
  const pages=Math.ceil(limit/18);
  const fetches=[];
  for(let i=0;i<Math.min(pages,3);i++){
    const p=page+i; let path="/komik/page/"+p+"/?orderby="+order;
    fetches.push(fetchHTML(path));
  }
  const results=await Promise.allSettled(fetches);
  let all=[], pag=null;
  results.forEach((r)=>{ if(r.status==="fulfilled"){ const $=r.value; all.push(...parseComicCards($,SEL)); if(!pag) pag=parsePagination($); } });
  const seen=new Set(); const dedup=all.filter((c)=>{ if(seen.has(c.slug)) return false; seen.add(c.slug); return true; });
  const final=dedup.slice(0,limit);
  sendSuccess(res,{ timestamp:getTimestamp(),responseTimeMs:Date.now()-s,page,limit,pagination:pag,total:final.length,results:final },"Unlimited access: berhasil mengambil "+final.length+" komik");
}));

router.get("/realtime", wrap(async(req,res)=>{
  const s=Date.now(); const $=await fetchHTML("/");
  const comics=parseComicCards($,SEL);
  const chapterUpdates=[]; $(SEL).each((_,el)=>{ const title=$(el).find("h3 a,h2 a").first().text().trim(),chLink=$(el).find(".lch a,.chapter a").first(),ch=chLink.text().trim(),chUrl=chLink.attr("href")||"",date=$(el).find(".date,time").first().text().trim(); if(title&&ch) chapterUpdates.push({ title,latestChapter:ch,chapterUrl:chUrl,lastUpdated:date||null }); });
  sendSuccess(res,{ timestamp:getTimestamp(),responseTimeMs:Date.now()-s,isRealtime:true,total:comics.length,recentUpdates:comics.slice(0,20),chapterUpdates:chapterUpdates.slice(0,20) },"Real-time data: "+comics.length+" komik terbaru");
}));

router.get("/terbaru", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const order=req.query.order||"update";
  const $=await fetchHTML(page>1?"/komik/page/"+page+"/?orderby="+order:"/komik/?orderby="+order);
  const c=parseComicCards($,SEL);
  if(!c.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,order,pagination:parsePagination($),total:c.length,results:c },"Berhasil mengambil "+c.length+" komik terbaru");
}));

router.get("/populer", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  let $,comics,pagination;
  for(const p of [page>1?"/komik/page/"+page+"/?orderby=popular":"/komik/?orderby=popular",page>1?"/populer/page/"+page+"/":"/populer/"]){
    try{ $=await fetchHTML(p); comics=parseComicCards($,SEL); if(comics.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!comics?.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ page,pagination,total:comics.length,results:comics },"Berhasil mengambil "+comics.length+" komik populer");
}));

router.get("/trending", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const period=req.query.period||"weekly";
  let $,comics,pagination;
  for(const p of [page>1?"/trending/page/"+page+"/":"/trending/",page>1?"/komik/page/"+page+"/?orderby=popular":"/komik/?orderby=popular"]){
    try{ $=await fetchHTML(p); comics=parseComicCards($,SEL); if(comics.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!comics?.length) return sendError(res,"Tidak ada data",404);
  const ranked=comics.map((c,i)=>({ rank:(page-1)*comics.length+i+1,...c }));
  sendSuccess(res,{ period,page,pagination,timestamp:getTimestamp(),total:ranked.length,results:ranked },"Berhasil mengambil "+ranked.length+" trending komik ("+period+")");
}));

router.get("/random", wrap(async(req,res)=>{
  const count=Math.min(parseInt(req.query.count)||12,50);
  const seed=req.query.seed||Date.now();
  const totalPages=50;
  const rp=Math.floor(Math.abs(Math.sin(seed)*totalPages))+1;
  const fetches=[rp,Math.max(1,rp-5),Math.min(totalPages,rp+5)].map((p)=>fetchHTML("/komik/page/"+p+"/"));
  const results=await Promise.allSettled(fetches);
  let all=[];
  results.forEach((r)=>{ if(r.status==="fulfilled") all.push(...parseComicCards(r.value,SEL)); });
  const seen=new Set(); all=all.filter((c)=>{ if(seen.has(c.slug)) return false; seen.add(c.slug); return true; });
  for(let i=all.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
  const final=all.slice(0,count);
  if(!final.length) return sendError(res,"Tidak ada data",404);
  sendSuccess(res,{ timestamp:getTimestamp(),count:final.length,seed,results:final },"Berhasil mengambil "+final.length+" komik secara random");
}));

router.get("/browse", wrap(async(req,res)=>{
  const { page="1",type="",genre="",status="",order="update",alpha="" }=req.query;
  const pn=parseInt(page)||1;
  const p=new URLSearchParams();
  if(type) p.set("type",type); if(genre) p.set("genre",genre); if(status) p.set("status",status); if(order) p.set("orderby",order); if(alpha) p.set("order",alpha);
  const qs=p.toString();
  const path=pn>1?"/komik/page/"+pn+"/"+( qs?"?"+qs:"" ):"/komik/"+( qs?"?"+qs:"" );
  const $=await fetchHTML(path);
  const c=parseComicCards($,SEL);
  sendSuccess(res,{ page:pn,filters:{ type,genre,status,order,alpha },pagination:parsePagination($),total:c.length,results:c },c.length?"Browse: "+c.length+" komik ditemukan":"Tidak ada komik dengan filter tersebut");
}));

router.get("/genres", wrap(async(req,res)=>{
  const genres=[];
  let $; try{ $=await fetchHTML("/genre/"); }catch{ $=await fetchHTML("/"); }
  $("a[href*='/genre/']").each((_,el)=>{ const name=$(el).text().trim(),href=$(el).attr("href")||"",sp=href.replace(/\/$/,"").split("/genre/"),slug=sp[1]||""; if(name&&slug&&!genres.find((g)=>g.slug===slug)) genres.push({ name,slug,url:href.startsWith("http")?href:BASE_URL+href,count:null }); });
  if(genres.length<5){
    const fb=["Action","Adventure","Comedy","Drama","Fantasy","Horror","Isekai","Magic","Mystery","Romance","Sci-fi","Slice of Life","Supernatural","Thriller","Martial Arts","Historical","Reincarnation","Harem","School Life","Psychological","Shounen","Seinen","Shoujo","Sports","Game"];
    fb.forEach((name)=>{ const slug=name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""); if(!genres.find((g)=>g.slug===slug)) genres.push({ name,slug,url:BASE_URL+"/genre/"+slug+"/",count:null }); });
  }
  sendSuccess(res,{ total:genres.length,genres },"Berhasil mengambil "+genres.length+" genre");
}));

router.get("/genre/:genre", wrap(async(req,res)=>{
  const { genre }=req.params; const page=parseInt(req.query.page)||1;
  const $=await fetchHTML(page>1?"/genre/"+genre+"/page/"+page+"/":"/genre/"+genre+"/");
  const gn=$("h1.entry-title,.page-title,h1").first().text().trim()||genre;
  const c=parseComicCards($,SEL);
  if(!c.length) return sendError(res,"Tidak ada komik untuk genre: "+genre,404);
  sendSuccess(res,{ genre:{name:gn,slug:genre},page,pagination:parsePagination($),total:c.length,results:c },"Berhasil mengambil "+c.length+" komik genre \""+gn+"\"");
}));

const TYPE_MAP={ manga:"Manga",manhwa:"Manhwa",manhua:"Manhua",webtoon:"Webtoon",novel:"Novel",doujin:"Doujin" };
router.get("/type/:type", wrap(async(req,res)=>{
  const type=req.params.type.toLowerCase(); const page=parseInt(req.query.page)||1;
  if(!TYPE_MAP[type]) return sendError(res,"Tipe tidak valid. Pilih: "+Object.keys(TYPE_MAP).join(", "),400);
  let $,comics,pagination;
  for(const p of [page>1?"/"+type+"/page/"+page+"/":"/"+type+"/",page>1?"/komik/page/"+page+"/?type="+type:"/komik/?type="+type]){
    try{ $=await fetchHTML(p); comics=parseComicCards($,SEL); if(comics.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!comics?.length) return sendError(res,"Tidak ada komik tipe \""+type+"\" ditemukan",404);
  sendSuccess(res,{ type:{ slug:type,name:TYPE_MAP[type] },page,pagination,total:comics.length,results:comics },"Berhasil mengambil "+comics.length+" komik tipe \""+TYPE_MAP[type]+"\"");
}));

router.get("/berwarna/:page", wrap(async(req,res)=>{
  const page=parseInt(req.params.page)||1;
  let $,comics,pagination;
  for(const p of [page>1?"/komik-berwarna/page/"+page+"/":"/komik-berwarna/",page>1?"/genre/full-color/page/"+page+"/":"/genre/full-color/"]){
    try{ $=await fetchHTML(p); comics=parseComicCards($,SEL); if(comics.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!comics?.length) return sendError(res,"Tidak ada komik berwarna di halaman "+page,404);
  sendSuccess(res,{ page,pagination,total:comics.length,results:comics },"Berhasil mengambil "+comics.length+" komik berwarna halaman "+page);
}));

router.get("/pustaka/:page", wrap(async(req,res)=>{
  const page=parseInt(req.params.page)||1;
  const alpha=req.query.alpha||""; const type=req.query.type||"";
  const p=new URLSearchParams(); if(alpha) p.set("order",alpha.toUpperCase()); if(type) p.set("type",type); p.set("orderby","title");
  const qs=p.toString();
  let $,comics,pagination;
  for(const path of [page>1?"/pustaka/page/"+page+"/"+( qs?"?"+qs:"" ):"/pustaka/"+( qs?"?"+qs:"" ),page>1?"/komik/page/"+page+"/?orderby=title":"/komik/?orderby=title"]){
    try{ $=await fetchHTML(path); comics=parseComicCards($,SEL); if(comics.length){ pagination=parsePagination($); break; } }catch{ /* continue */ }
  }
  if(!comics?.length) return sendError(res,"Tidak ada data pustaka di halaman "+page,404);
  sendSuccess(res,{ page,alpha:alpha||"ALL",type:type||"ALL",pagination,total:comics.length,results:comics },"Berhasil mengambil "+comics.length+" komik pustaka halaman "+page);
}));

router.get("/search", wrap(async(req,res)=>{
  const q=(req.query.q||req.query.keyword||req.query.s||"").trim();
  const page=parseInt(req.query.page)||1;
  if(!q) return sendError(res,"Parameter ?q= tidak boleh kosong",400);
  const path=page>1?"/page/"+page+"/?s="+encodeURIComponent(q):"/?s="+encodeURIComponent(q);
  const $=await fetchHTML(path);
  const c=parseComicCards($,SEL+", .search-result .item");
  sendSuccess(res,{ keyword:q,page,pagination:parsePagination($),total:c.length,results:c },c.length?"Ditemukan "+c.length+" komik untuk: \""+q+"\"":"Tidak ada komik untuk: \""+q+"\"");
}));

router.get("/advanced-search", wrap(async(req,res)=>{
  const { q="",genre="",type="",status="",order="update",page="1",alpha="" }=req.query;
  const pn=parseInt(page)||1;
  const p=new URLSearchParams();
  if(q) p.set("s",q); if(genre) p.set("genre",genre); if(type) p.set("type",type); if(status) p.set("status",status); if(order) p.set("orderby",order); if(alpha) p.set("order",alpha);
  const qs=p.toString();
  const path=pn>1?"/komik/page/"+pn+"/"+( qs?"?"+qs:"" ):"/komik/"+( qs?"?"+qs:"" );
  const $=await fetchHTML(path);
  const c=parseComicCards($,SEL);
  sendSuccess(res,{ filters:{ q,genre,type,status,order,alpha },page:pn,pagination:parsePagination($),total:c.length,results:c },c.length?"Ditemukan "+c.length+" komik":"Tidak ada komik dengan filter tersebut");
}));

router.get("/recommendations", wrap(async(req,res)=>{
  const slug=req.query.slug||"";
  const count=Math.min(parseInt(req.query.count)||12,30);
  let baseGenres=[]; let comicTitle="";
  if(slug){
    try{
      const $d=await fetchHTML("/manga/"+slug+"/");
      comicTitle=$d("h1.entry-title,h1").first().text().trim();
      $d("a[href*='/genre/']").each((_,el)=>{ const g=$d(el).attr("href")?.replace(/\/$/,"").split("/genre/")[1]; if(g&&!baseGenres.includes(g)) baseGenres.push(g); });
    }catch{ /* continue */ }
  }
  const rec=[]; const seen=new Set([slug]);
  for(const g of baseGenres.slice(0,2)){
    try{
      const $=await fetchHTML("/genre/"+g+"/");
      parseComicCards($,SEL).forEach((c)=>{ if(!seen.has(c.slug)){ seen.add(c.slug); rec.push({ ...c,recommendedBecause:"Genre: "+g }); } });
    }catch{ /* continue */ }
    if(rec.length>=count) break;
  }
  if(rec.length<count){
    const $=await fetchHTML("/komik/?orderby=popular");
    parseComicCards($,SEL).forEach((c)=>{ if(!seen.has(c.slug)&&rec.length<count){ seen.add(c.slug); rec.push({ ...c,recommendedBecause:"Populer" }); } });
  }
  sendSuccess(res,{ timestamp:getTimestamp(),basedOn:slug?{ slug,title:comicTitle,genres:baseGenres }:{ genres:baseGenres },total:rec.length,results:rec.slice(0,count) },"Berhasil mengambil "+Math.min(rec.length,count)+" rekomendasi");
}));

router.get("/scroll", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const order=req.query.order||"update";
  const $=await fetchHTML(page>1?"/komik/page/"+page+"/?orderby="+order:"/komik/?orderby="+order);
  const c=parseComicCards($,SEL);
  const pag=parsePagination($);
  sendSuccess(res,{ timestamp:getTimestamp(),scrollPage:page,hasMore:pag.hasNextPage,nextPage:pag.hasNextPage?page+1:null,pagination:pag,total:c.length,results:c },"Infinite scroll halaman "+page+": "+c.length+" komik dimuat");
}));

router.get("/infinite", wrap(async(req,res)=>{
  const cursor=parseInt(req.query.cursor)||0;
  const limit=Math.min(parseInt(req.query.limit)||12,50);
  const order=req.query.order||"update";
  const IPP=18;
  const page=Math.floor(cursor/IPP)+1;
  const offset=cursor%IPP;
  const $=await fetchHTML(page>1?"/komik/page/"+page+"/?orderby="+order:"/komik/?orderby="+order);
  let comics=parseComicCards($,SEL);
  const pag=parsePagination($);
  comics=comics.slice(offset,offset+limit);
  if(comics.length<limit&&pag.hasNextPage){
    try{ const $n=await fetchHTML("/komik/page/"+(page+1)+"/?orderby="+order); const more=parseComicCards($n,SEL); comics.push(...more.slice(0,limit-comics.length)); }catch{ /* continue */ }
  }
  const nextCursor=cursor+comics.length;
  sendSuccess(res,{ timestamp:getTimestamp(),cursor,nextCursor:pag.hasNextPage?nextCursor:null,limit,hasMore:pag.hasNextPage,total:comics.length,results:comics },"Infinite load cursor "+cursor+": "+comics.length+" komik dimuat");
}));

const favStore=new Map();
router.all("/favorites", wrap(async(req,res)=>{
  const userId=req.headers["x-user-id"]||req.query.userId||req.query.uid||null;
  if(!userId) return sendError(res,"Header 'x-user-id' atau query ?userId= diperlukan",401,{ hint:"Tambahkan header: x-user-id: <your-user-id>", example:"GET /comic/favorites?userId=user123" });
  const method=req.method;
  if(method==="GET"){
    const favs=favStore.get(userId)||[];
    return sendSuccess(res,{ userId,timestamp:getTimestamp(),total:favs.length,favorites:favs },favs.length?"Berhasil mengambil "+favs.length+" favorit":"Belum ada favorit");
  }
  if(method==="POST"){
    const { slug,title,url,thumbnail }=req.body||req.query;
    if(!slug) return sendError(res,"Slug komik diperlukan",400);
    const favs=favStore.get(userId)||[];
    if(favs.find((f)=>f.slug===slug)) return sendError(res,"Komik \""+slug+"\" sudah di favorit",409);
    const nf={ slug,title:title||slug,url:url||BASE_URL+"/manga/"+slug+"/",thumbnail:thumbnail||null,addedAt:getTimestamp() };
    favs.push(nf); favStore.set(userId,favs);
    return sendSuccess(res,{ userId,added:nf,total:favs.length },"Komik \""+slug+"\" berhasil ditambahkan ke favorit");
  }
  if(method==="DELETE"){
    const { slug }=req.query||req.body||{};
    if(!slug) return sendError(res,"Slug komik diperlukan",400);
    const favs=favStore.get(userId)||[];
    const idx=favs.findIndex((f)=>f.slug===slug);
    if(idx===-1) return sendError(res,"Komik \""+slug+"\" tidak ada di favorit",404);
    const removed=favs.splice(idx,1)[0]; favStore.set(userId,favs);
    return sendSuccess(res,{ userId,removed,total:favs.length },"Komik \""+slug+"\" berhasil dihapus dari favorit");
  }
  sendError(res,"Method "+method+" tidak didukung",405);
}));

router.get("/comic/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/manga/"+slug+"/","/"+slug+"/","/komik/"+slug+"/","/manhwa/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"Komik \""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim();
  if(!title) return sendError(res,"Komik \""+slug+"\" tidak ditemukan",404);
  const image=$(".thumb img,.cover img,.featured-image img").first().attr("src")||( slug?THUMB_URL+"/"+slug+".jpg":null );
  const synopsis=$(".entry-content p,.synp p,.desc p").first().text().trim()||null;
  const info=parseComicInfo($);
  const genres=[]; $("a[href*='/genre/'],.genre a").each((_,el)=>{ const name=$(el).text().trim(),href=$(el).attr("href")||""; if(name&&!genres.find((g)=>g.name===name)) genres.push({ name,slug:href.replace(/\/$/,"").split("/genre/")[1]||extractSlug(href),url:href }); });
  const type=$(".type,.typeflag,.comic-type").first().text().trim()||info["tipe"]||null;
  const status=$(".status,.statusx").first().text().trim()||info["status"]||null;
  const rating=$(".numscore,.rating,.score").first().text().trim()||null;
  const author=$(".author a,.info .author").first().text().trim()||info["pengarang"]||info["author"]||null;
  const chapters=[]; $(".chapter-list li,#chapter-list li,.eplister ul li,.episodelist li").each((_,el)=>{ const ct=$(el).find("a").first().text().trim(),ch=$(el).find("a").first().attr("href")||"",cd=$(el).find(".date,time").first().text().trim(); if(ct&&ch) chapters.push({ title:ct,slug:extractSlug(ch),url:ch,date:cd||null }); });
  sendSuccess(res,{ timestamp:getTimestamp(),title,slug,url:BASE_URL+usedPath,thumbnail:image,type,status,rating,author,synopsis,genres,info,totalChapters:chapters.length,chapters:chapters.length?chapters:null },"Berhasil mengambil detail komik: "+title);
}));

router.get("/chapter/:slug/navigation", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/chapter/"+slug+"/","/baca/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1,.entry-title").first().text().trim()){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"Chapter \""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1").first().text().trim()||slug;
  const prev=$(".prevch a,a.prev-chapter,.chapter-nav .prev a").first().attr("href")||null;
  const next=$(".nextch a,a.next-chapter,.chapter-nav .next a").first().attr("href")||null;
  const allChapters=[]; $("select.chapter option,#chapter-select option").each((_,el)=>{ const l=$(el).text().trim(),u=$(el).attr("value")||"",ic=$(el).is(":selected")||$(el).attr("selected"); if(l&&u) allChapters.push({ label:l,slug:extractSlug(u),url:u,isCurrent:!!ic }); });
  const numMatch=(slug+" "+title).match(/chapter[- ]?(\d+(\.\d+)?)/i);
  const chNum=numMatch?parseFloat(numMatch[1]):null;
  const totalPages=$("#Baca_Komik img,.chapter-images img,.reading-content img").length||null;
  sendSuccess(res,{ timestamp:getTimestamp(),title,slug,url:BASE_URL+usedPath,chapterNumber:chNum,totalPages,navigation:{ prevChapter:prev?{ slug:extractSlug(prev),url:prev }:null, nextChapter:next?{ slug:extractSlug(next),url:next }:null, totalChapters:allChapters.length, allChapters:allChapters.length?allChapters:null } },"Navigasi chapter \""+title+"\" berhasil diambil");
}));

router.get("/chapter/:slug", wrap(async(req,res)=>{
  const { slug }=req.params;
  let $,usedPath;
  for(const p of ["/"+slug+"/","/chapter/"+slug+"/","/baca/"+slug+"/"]){
    try{ $=await fetchHTML(p); if($("h1,.entry-title,#Baca_Komik,.chapter-images").length){ usedPath=p; break; } }catch{ /* continue */ }
  }
  if(!$) return sendError(res,"Chapter \""+slug+"\" tidak ditemukan",404);
  const title=$("h1.entry-title,h1,.reader-title").first().text().trim()||slug;
  let images=parseChapterImages($);
  if(!images.length){
    const seen=new Set(); $(".entry-content img,main img").each((i,el)=>{ const src=$(el).attr("src")||$(el).attr("data-src")||""; if(src&&src.startsWith("http")&&!seen.has(src)&&!src.includes("logo")){ seen.add(src); images.push({ page:i+1,url:src,width:null,height:null }); } });
  }
  if(!images.length) return sendError(res,"Tidak ada halaman ditemukan untuk chapter: \""+slug+"\"",404);
  const prev=$(".prevch a,a.prev-chapter").first().attr("href")||null;
  const next=$(".nextch a,a.next-chapter").first().attr("href")||null;
  const chapterSelect=[]; $("select.chapter option,#chapter-select option").each((_,el)=>{ const l=$(el).text().trim(),v=$(el).attr("value")||""; if(l&&v) chapterSelect.push({ label:l,url:v }); });
  const numMatch=(slug+" "+title).match(/chapter[- ]?(\d+(\.\d+)?)/i);
  sendSuccess(res,{ timestamp:getTimestamp(),title,slug,url:BASE_URL+usedPath,chapterNumber:numMatch?parseFloat(numMatch[1]):null,totalPages:images.length,pages:images,navigation:{ prevChapter:prev||null,nextChapter:next||null },chapterSelect:chapterSelect.length?chapterSelect:null },"Berhasil mengambil "+images.length+" halaman chapter: "+title);
}));

module.exports = router;
