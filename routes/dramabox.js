// routes/dramabox.js — Creator: matchadesu_
const router = require("express").Router();
const { fetchWithAuth, fetchPublic, tryEndpoints, ensureToken, guestLogin, refreshAccessToken, normalizeDrama, normalizeEpisode, normalizeStreamSource, normalizePagination, getTokenStore, getTimestamp, generateDeviceId, ENDPOINTS, BASE_API_V1, BASE_API_V2, BASE_API, BASE_CDN, BASE_WEB, tokenStore } = require("../lib/scraper-dramabox");
const { sendSuccess, sendError } = require("../lib/response");
const wrap = (fn) => async (req,res) => { try{ await fn(req,res); }catch(e){ sendError(res,e.message,500); } };

function parseList(payload){
  if(!payload) return [];
  const p=payload.data||payload.result||payload.response||payload.list||payload||{};
  const raw=Array.isArray(p)?p:p.list||p.items||p.dramas||p.data||p.results||[];
  return raw.map((d)=>normalizeDrama(d)).filter((d)=>d&&d.title);
}

router.get("/search", wrap(async(req,res)=>{
  const q=(req.query.q||req.query.keyword||req.query.s||"").trim();
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const genre=req.query.genre||""; const country=req.query.country||""; const year=req.query.year||""; const status=req.query.status||""; const order=req.query.order||"relevance"; const type=req.query.type||"";
  if(!q) return sendError(res,"Parameter ?q= tidak boleh kosong. Contoh: /dramabox/search?q=my+love",400);
  const s=Date.now(); await ensureToken().catch(()=>null);
  const sp={ keyword:q,q,s:q,query:q,page,pageNum:page,pageSize:limit,limit,size:limit,order,orderBy:order,sort:order,...(genre&&{ genre,genreId:genre }),...(country&&{ country,countryCode:country }),...(year&&{ year,releaseYear:year }),...(status&&{ status }),...(type&&{ type,dramaType:type }) };
  const { data:raw, source }=await tryEndpoints([
    { label:BASE_API_V1+ENDPOINTS.SEARCH,    fn:()=>fetchWithAuth(ENDPOINTS.SEARCH,sp) },
    { label:BASE_API_V1+ENDPOINTS.SEARCH_V2, fn:()=>fetchWithAuth(ENDPOINTS.SEARCH_V2,sp) },
    { label:BASE_API_V2+ENDPOINTS.SEARCH,    fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.SEARCH,sp) },
    { label:BASE_API_V1+"/drama/search",     fn:()=>fetchWithAuth("/drama/search",sp) },
    { label:BASE_API_V1+"/series/search",    fn:()=>fetchWithAuth("/series/search",sp) },
    { label:BASE_API+ENDPOINTS.SEARCH,       fn:()=>fetchPublic(BASE_API,ENDPOINTS.SEARCH,sp) },
  ]);
  const dramas=parseList(raw);
  if(!dramas.length) return sendError(res,"Tidak ada drama ditemukan untuk keyword: \""+q+"\"",404);
  const payload=raw?.data||raw?.result||raw||{};
  const sugg=(payload.suggestions||payload.suggest||[]).map((s)=>typeof s==="string"?s:s.keyword||"").filter(Boolean);
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    keyword:q, filters:{ genre:genre||null,country:country||null,year:year||null,status:status||null,order:order||null,type:type||null },
    pagination:normalizePagination(payload,page,limit),
    suggestions:sugg.length?sugg:null, total:dramas.length, results:dramas
  },"Ditemukan "+dramas.length+" drama untuk: \""+q+"\" (halaman "+page+")");
}));

router.get("/latest", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const genre=req.query.genre||""; const country=req.query.country||""; const type=req.query.type||""; const status=req.query.status||"";
  const s=Date.now(); await ensureToken().catch(()=>null);
  const rp={ page,pageNum:page,pageSize:limit,limit,size:limit,order:"latest",orderBy:"update",sort:"latest",...(genre&&{ genre,genreId:genre }),...(country&&{ country,countryCode:country }),...(type&&{ type,dramaType:type }),...(status&&{ status }) };
  const { data:raw, source }=await tryEndpoints([
    { label:BASE_API_V1+ENDPOINTS.LATEST,      fn:()=>fetchWithAuth(ENDPOINTS.LATEST,rp) },
    { label:BASE_API_V1+ENDPOINTS.NEW_RELEASE,  fn:()=>fetchWithAuth(ENDPOINTS.NEW_RELEASE,rp) },
    { label:BASE_API_V2+ENDPOINTS.LATEST,       fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.LATEST,rp) },
    { label:BASE_API_V1+"/drama/list",           fn:()=>fetchWithAuth("/drama/list",{ ...rp,sort:"latest" }) },
    { label:BASE_API_V1+"/drama/new",            fn:()=>fetchWithAuth("/drama/new",rp) },
    { label:BASE_API_V1+"/home/new",             fn:()=>fetchWithAuth("/home/new",rp) },
    { label:BASE_API+ENDPOINTS.LATEST,           fn:()=>fetchPublic(BASE_API,ENDPOINTS.LATEST,rp) },
  ]);
  const dramas=parseList(raw);
  if(!dramas.length) return sendError(res,"Tidak ada drama terbaru ditemukan",404);
  const payload=raw?.data||raw?.result||raw||{};
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    filters:{ genre:genre||null,country:country||null,type:type||null,status:status||null },
    pagination:normalizePagination(payload,page,limit),
    total:dramas.length, results:dramas
  },"Berhasil mengambil "+dramas.length+" drama terbaru halaman "+page);
}));

router.get("/trending", wrap(async(req,res)=>{
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const period=req.query.period||"daily";
  const genre=req.query.genre||""; const country=req.query.country||""; const type=req.query.type||"";
  const s=Date.now(); await ensureToken().catch(()=>null);
  const periodMap={ daily:"day",weekly:"week",monthly:"month",alltime:"all" };
  const rp={ page,pageNum:page,pageSize:limit,limit,size:limit,period,type:periodMap[period]||"day",orderBy:"hot",sort:"trending",...(genre&&{ genre,genreId:genre }),...(country&&{ country,countryCode:country }),...(type&&{ dramaType:type }) };
  const { data:raw, source }=await tryEndpoints([
    { label:BASE_API_V1+ENDPOINTS.TRENDING, fn:()=>fetchWithAuth(ENDPOINTS.TRENDING,rp) },
    { label:BASE_API_V1+ENDPOINTS.HOT,      fn:()=>fetchWithAuth(ENDPOINTS.HOT,rp) },
    { label:BASE_API_V1+ENDPOINTS.RANK,     fn:()=>fetchWithAuth(ENDPOINTS.RANK,rp) },
    { label:BASE_API_V2+ENDPOINTS.TRENDING, fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.TRENDING,rp) },
    { label:BASE_API_V1+ENDPOINTS.POPULAR,  fn:()=>fetchWithAuth(ENDPOINTS.POPULAR,rp) },
    { label:BASE_API_V1+"/drama/hot-list",  fn:()=>fetchWithAuth("/drama/hot-list",rp) },
    { label:BASE_API_V1+"/home/hot",        fn:()=>fetchWithAuth("/home/hot",rp) },
    { label:BASE_API+ENDPOINTS.TRENDING,    fn:()=>fetchPublic(BASE_API,ENDPOINTS.TRENDING,rp) },
  ]);
  const payload=raw?.data||raw?.result||raw||{};
  const listRaw=Array.isArray(payload)?payload:payload.list||payload.items||payload.dramas||payload.data||payload.results||payload.rank||[];
  const dramas=listRaw.map((d,i)=>({ rank:(page-1)*limit+i+1,...normalizeDrama(d),hotScore:d.hotScore||d.hot_score||d.score||d.heat||null })).filter((d)=>d.title);
  if(!dramas.length) return sendError(res,"Tidak ada drama trending ditemukan",404);
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    period, filters:{ genre:genre||null,country:country||null,type:type||null },
    pagination:normalizePagination(payload,page,limit),
    total:dramas.length, results:dramas
  },"Berhasil mengambil "+dramas.length+" drama trending ("+period+") halaman "+page);
}));

router.get("/detail", wrap(async(req,res)=>{
  const dramaId=req.query.id||req.query.dramaId||req.query.drama_id||"";
  const slug=req.query.slug||req.query.name||req.query.title||"";
  const epPage=parseInt(req.query.epPage||req.query.episode_page)||1;
  const epLimit=Math.min(parseInt(req.query.epLimit||req.query.episode_limit)||50,100);
  const epOrder=req.query.epOrder||"asc";
  if(!dramaId&&!slug) return sendError(res,"Parameter ?id= atau ?slug= diperlukan. Contoh: /dramabox/detail?id=12345",400);
  const s=Date.now(); await ensureToken().catch(()=>null);
  const rp={ id:dramaId,dramaId,drama_id:dramaId,seriesId:dramaId,slug,name:slug };
  const { data:dRaw, source:dSrc }=await tryEndpoints([
    { label:BASE_API_V1+ENDPOINTS.DETAIL,                 fn:()=>fetchWithAuth(ENDPOINTS.DETAIL,rp) },
    { label:BASE_API_V1+ENDPOINTS.DETAIL+"/"+dramaId,     fn:()=>fetchWithAuth(ENDPOINTS.DETAIL+"/"+dramaId) },
    { label:BASE_API_V1+"/drama/info",                    fn:()=>fetchWithAuth("/drama/info",rp) },
    { label:BASE_API_V1+"/drama/info/"+dramaId,           fn:()=>fetchWithAuth("/drama/info/"+dramaId) },
    { label:BASE_API_V2+ENDPOINTS.DETAIL,                 fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.DETAIL,rp) },
    { label:BASE_API_V1+"/series/detail",                 fn:()=>fetchWithAuth("/series/detail",rp) },
    { label:BASE_API+ENDPOINTS.DETAIL+"/"+dramaId,        fn:()=>fetchPublic(BASE_API,ENDPOINTS.DETAIL+"/"+dramaId) },
  ]);
  const dp=dRaw?.data||dRaw?.result||dRaw?.drama||dRaw?.series||dRaw||{};
  const drama=normalizeDrama(dp);
  if(!drama?.title) return sendError(res,"Drama ID \""+( dramaId||slug )+"\" tidak ditemukan",404);
  const eid=dramaId||drama.id;
  const ep2={ id:eid,dramaId:eid,drama_id:eid,page:epPage,pageNum:epPage,pageSize:epLimit,limit:epLimit,size:epLimit,order:epOrder,sort:epOrder };
  let episodes=[],epPag=null,epSrc=null;
  try{
    const { data:epRaw, source:es }=await tryEndpoints([
      { label:BASE_API_V1+ENDPOINTS.EPISODES,              fn:()=>fetchWithAuth(ENDPOINTS.EPISODES,ep2) },
      { label:BASE_API_V1+ENDPOINTS.EPISODES+"/"+eid,      fn:()=>fetchWithAuth(ENDPOINTS.EPISODES+"/"+eid,{ page:epPage,limit:epLimit }) },
      { label:BASE_API_V1+ENDPOINTS.EPISODE_LIST,          fn:()=>fetchWithAuth(ENDPOINTS.EPISODE_LIST,ep2) },
      { label:BASE_API_V1+"/drama/"+eid+"/episodes",       fn:()=>fetchWithAuth("/drama/"+eid+"/episodes",{ page:epPage,limit:epLimit }) },
      { label:BASE_API_V2+ENDPOINTS.EPISODES,              fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.EPISODES,ep2) },
      { label:BASE_API_V1+"/series/"+eid+"/episodes",      fn:()=>fetchWithAuth("/series/"+eid+"/episodes",{ page:epPage,limit:epLimit }) },
    ]);
    const epp=epRaw?.data||epRaw?.result||epRaw?.episodes||epRaw?.list||epRaw||{};
    const elr=Array.isArray(epp)?epp:epp.list||epp.items||epp.episodes||epp.data||epp.results||[];
    episodes=elr.map((e)=>normalizeEpisode(e)).filter(Boolean);
    if(epOrder==="desc") episodes.sort((a,b)=>(parseFloat(b.number)||0)-(parseFloat(a.number)||0));
    else episodes.sort((a,b)=>(parseFloat(a.number)||0)-(parseFloat(b.number)||0));
    epPag=normalizePagination(epp,epPage,epLimit); epSrc=es;
  }catch{ /* opsional */ }
  let related=[];
  try{
    const { data:rr }=await tryEndpoints([
      { label:BASE_API_V1+"/drama/recommend", fn:()=>fetchWithAuth("/drama/recommend",{ id:eid,limit:10 }) },
      { label:BASE_API_V1+"/drama/related",   fn:()=>fetchWithAuth("/drama/related",{ id:eid,limit:10 }) },
    ]);
    const rp2=rr?.data||rr?.list||rr||{};
    const rl=Array.isArray(rp2)?rp2:rp2.list||rp2.data||rp2.dramas||[];
    related=rl.map((d)=>normalizeDrama(d)).filter((d)=>d?.title);
  }catch{ /* opsional */ }
  const freeEps=episodes.filter((e)=>!e.isLocked&&!e.isPremium).length;
  const lockedEps=episodes.filter((e)=>e.isLocked||e.isPremium).length;
  const firstEp=episodes.reduce((a,b)=>(parseFloat(a?.number)||Infinity)<(parseFloat(b?.number)||Infinity)?a:b,null);
  const latEp=episodes.reduce((a,b)=>(parseFloat(a?.number)||0)>(parseFloat(b?.number)||0)?a:b,null);
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source:dSrc,
    drama,
    episodeInfo:{ source:epSrc,order:epOrder,pagination:epPag,summary:{ total:episodes.length,freeEpisodes:freeEps,lockedEpisodes:lockedEps,firstEpisode:firstEp,latestEpisode:latEp },episodes:episodes.length?episodes:null },
    related:related.length?{ total:related.length,results:related }:null
  },"Berhasil mengambil detail drama: "+drama.title);
}));

router.get("/stream", wrap(async(req,res)=>{
  const episodeId=req.query.id||req.query.episodeId||req.query.episode_id||"";
  const dramaId=req.query.dramaId||req.query.drama_id||req.query.seriesId||"";
  const epNumber=req.query.ep||req.query.episode||req.query.num||"";
  const quality=req.query.quality||req.query.definition||"auto";
  const lang=req.query.lang||req.query.language||"id";
  const clientToken=req.headers["x-access-token"]||req.headers["authorization"]?.replace("Bearer ","")||req.query.token||null;
  if(!episodeId&&!dramaId&&!epNumber) return sendError(res,"Parameter ?id=episodeId atau kombinasi ?dramaId=&ep= diperlukan",400,{ hint:"Contoh: /dramabox/stream?id=ep123 atau /dramabox/stream?dramaId=456&ep=1" });
  const s=Date.now();
  if(clientToken) tokenStore.accessToken=clientToken;
  else await ensureToken().catch(()=>null);
  const sp={ id:episodeId,episodeId,episode_id:episodeId,dramaId,drama_id:dramaId,seriesId:dramaId,ep:epNumber,episode:epNumber,episodeNum:epNumber,quality,definition:quality,lang,language:lang };
  Object.keys(sp).forEach((k)=>{ if(!sp[k]) delete sp[k]; });
  const targets=[
    { label:BASE_API_V1+ENDPOINTS.STREAM,        fn:()=>fetchWithAuth(ENDPOINTS.STREAM,sp) },
    { label:BASE_API_V1+ENDPOINTS.PLAY_URL,       fn:()=>fetchWithAuth(ENDPOINTS.PLAY_URL,sp) },
    { label:BASE_API_V2+ENDPOINTS.STREAM_V2,      fn:()=>fetchPublic(BASE_API_V2,ENDPOINTS.STREAM_V2,sp) },
    { label:BASE_API_V1+ENDPOINTS.VIDEO_INFO,     fn:()=>fetchWithAuth(ENDPOINTS.VIDEO_INFO,sp) },
    { label:BASE_API_V1+ENDPOINTS.SOURCE,         fn:()=>fetchWithAuth(ENDPOINTS.SOURCE,sp) },
    { label:BASE_API_V1+ENDPOINTS.EPISODE_DETAIL, fn:()=>fetchWithAuth(ENDPOINTS.EPISODE_DETAIL,sp) },
  ];
  if(episodeId){
    targets.push({ label:BASE_API_V1+"/episode/"+episodeId+"/stream", fn:()=>fetchWithAuth("/episode/"+episodeId+"/stream",{ quality,lang }) });
    targets.push({ label:BASE_API_V1+"/episode/"+episodeId+"/play",   fn:()=>fetchWithAuth("/episode/"+episodeId+"/play",  { quality,lang }) });
  }
  if(dramaId&&epNumber){
    targets.push({ label:BASE_API_V1+"/drama/"+dramaId+"/episode/"+epNumber, fn:()=>fetchWithAuth("/drama/"+dramaId+"/episode/"+epNumber,{ quality,lang }) });
    targets.push({ label:BASE_API_V1+"/series/"+dramaId+"/episode/"+epNumber+"/stream", fn:()=>fetchWithAuth("/series/"+dramaId+"/episode/"+epNumber+"/stream",{ quality,lang }) });
  }
  targets.push({ label:BASE_API+ENDPOINTS.STREAM, fn:()=>fetchPublic(BASE_API,ENDPOINTS.STREAM,sp) });
  const { data:streamRaw, source }=await tryEndpoints(targets);
  const payload=streamRaw?.data||streamRaw?.result||streamRaw?.stream||streamRaw?.video||streamRaw?.episode||streamRaw||{};
  const epInfo=normalizeEpisode(payload.episode||payload.episodeInfo||payload.info||payload);
  const srcRaw=payload.sources||payload.streams||payload.qualities||payload.urls||payload.videos||[];
  let streamSources=Array.isArray(srcRaw)&&srcRaw.length?srcRaw.map((s2)=>normalizeStreamSource(s2)).filter(Boolean):[];
  const singleUrl=payload.url||payload.streamUrl||payload.stream_url||payload.playUrl||payload.play_url||payload.videoUrl||payload.src||null;
  if(!streamSources.length&&singleUrl) streamSources.push(normalizeStreamSource({ url:singleUrl,quality:payload.quality||quality||"auto",format:"video/mp4" }));
  const subsRaw=payload.subtitles||payload.subs||payload.captions||[];
  const subtitles=Array.isArray(subsRaw)?subsRaw.map((s2)=>({ language:s2.language||s2.lang||null,label:s2.label||s2.name||null,url:s2.url||s2.src||null,format:s2.format||"srt" })).filter((s2)=>s2.url):null;
  const tokenInfo=getTokenStore();
  if(!streamSources.length) return sendError(res,"Stream URL tidak ditemukan. Kemungkinan episode dikunci atau perlu login premium.",404,{ hint:"Gunakan /dramabox/auth/refresh untuk mendapatkan token baru",tokenStatus:{ hasToken:tokenInfo.hasToken,isExpired:tokenInfo.isExpired } });
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    episodeInfo:epInfo, quality,language:lang,
    totalSources:streamSources.length, streamSources,
    subtitles:subtitles?.length?subtitles:null,
    drmInfo:payload.drm||null,
    tokenInfo:{ hasToken:tokenInfo.hasToken,isExpired:tokenInfo.isExpired,userId:tokenInfo.userId }
  },"Berhasil mengambil stream untuk episode: "+(epInfo?.title||episodeId||"EP "+epNumber));
}));

router.all("/auth/refresh", wrap(async(req,res)=>{
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  const s=Date.now();
  const clientRT=req.headers["x-refresh-token"]||req.headers["authorization"]?.replace("Bearer ","")||req.query.refreshToken||req.query.refresh_token||req.body?.refreshToken||tokenStore.refreshToken||null;
  const forceNew=req.query.force==="true"||req.query.reset==="true";
  const forcedDev=req.query.deviceId||null;
  if(forceNew){
    tokenStore.accessToken=null; tokenStore.refreshToken=null; tokenStore.expiresAt=null; tokenStore.userId=null;
    tokenStore.deviceId=forcedDev||generateDeviceId();
  }
  let newToken=null,newRefresh=null,newExpiry=null,method=null;
  if(clientRT&&!forceNew){
    try{ const r=await refreshAccessToken(clientRT); newToken=r.accessToken; newRefresh=r.refreshToken; newExpiry=r.expiresAt; method="token_refresh"; }catch{ /* lanjut */ }
  }
  if(!newToken){
    try{ newToken=await guestLogin(); newRefresh=tokenStore.refreshToken; newExpiry=tokenStore.expiresAt; method="guest_login"; }catch(e){ throw new Error("Guest login gagal: "+e.message); }
  }
  const ti=getTokenStore();
  const now=Date.now();
  const ems=newExpiry?(typeof newExpiry==="number"?newExpiry:new Date(newExpiry).getTime())-now:null;
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, method,
    token:{ accessToken:newToken||tokenStore.accessToken||null, refreshToken:newRefresh||tokenStore.refreshToken||null, expiresAt:newExpiry||tokenStore.expiresAt||null, expiresInSec:ems?Math.max(0,Math.floor(ems/1000)):null, isValid:!ti.isExpired&&!!tokenStore.accessToken },
    device:{ deviceId:tokenStore.deviceId, userId:tokenStore.userId||null, platform:"web", region:"ID" },
    status:{ hasToken:!!tokenStore.accessToken, hasRefresh:!!tokenStore.refreshToken, isExpired:ti.isExpired, isGuestMode:method==="guest_login", isPremium:false },
    usage:{ hint:"Gunakan accessToken di header X-Access-Token atau Authorization: Bearer <token>", streamEndpoint:"GET /dramabox/stream?id=episodeId", refreshHint:"GET /dramabox/auth/refresh?force=true untuk mendapatkan token baru" }
  },newToken?"Token berhasil "+(method==="token_refresh"?"di-refresh":"dibuat baru"):"Gagal mendapatkan token");
}));

module.exports = router;
