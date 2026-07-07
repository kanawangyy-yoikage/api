// routes/novel.js — Creator: matchadesu_
const router = require("express").Router();
const { fetchCDN, fetchAPI, fetchURL, tryMultiEndpoint, normalizeNovel, normalizeGenreObj, normalizeChapterList, normalizeChapter, getTimestamp, ENDPOINTS, BASE_CDN, BASE_APP, BASE_ALT } = require("../lib/scraper-novel");
const { sendSuccess, sendError } = require("../lib/response");
const wrap = (fn) => async (req,res) => { try{ await fn(req,res); }catch(e){ sendError(res,e.message,500); } };

router.get("/home", wrap(async(req,res)=>{
  const s=Date.now();
  const { data:raw, source }=await tryMultiEndpoint([
    { label:BASE_CDN+ENDPOINTS.HOME,    fn:()=>fetchCDN(ENDPOINTS.HOME) },
    { label:BASE_CDN+ENDPOINTS.HOME_V2, fn:()=>fetchCDN(ENDPOINTS.HOME_V2) },
    { label:BASE_ALT+ENDPOINTS.HOME,    fn:()=>fetchAPI(ENDPOINTS.HOME) },
    { label:BASE_CDN+"/api/v1/home",    fn:()=>fetchURL(BASE_CDN+"/api/v1/home") },
    { label:BASE_CDN+"/api/index",      fn:()=>fetchURL(BASE_CDN+"/api/index") },
    { label:BASE_CDN+ENDPOINTS.FEATURED, fn:()=>fetchCDN(ENDPOINTS.FEATURED||"/api/featured") },
  ]);
  const payload=raw?.data||raw?.result||raw?.response||raw||{};
  const N=(arr)=>Array.isArray(arr)?arr.map((n)=>normalizeNovel(n)).filter(Boolean):[];
  const G=(arr)=>Array.isArray(arr)?arr.map((g)=>normalizeGenreObj(g)).filter(Boolean):[];
  const banner=N(payload.banner||payload.slider||payload.featured||[]);
  const hot   =N(payload.hot||payload.recommend||payload.popular||payload.hotList||[]);
  const latest=N(payload.latest||payload.terbaru||payload.new||payload.update||[]);
  const compl =N(payload.completed||payload.finish||[]);
  const rank  =N(payload.rank||payload.ranking||payload.trending||[]);
  const genres=G(payload.genre||payload.genres||payload.category||[]);
  const allN  =[]; if(!hot.length&&!latest.length&&Array.isArray(payload)) payload.forEach((i)=>{ const n=normalizeNovel(i); if(n?.title) allN.push(n); });
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    banner:banner.length?banner:null,
    hot:hot.length?{ total:hot.length,results:hot }:null,
    latest:latest.length?{ total:latest.length,results:latest }:null,
    completed:compl.length?{ total:compl.length,results:compl }:null,
    rank:rank.length?{ total:rank.length,results:rank }:null,
    genres:genres.length?genres:null,
    novels:allN.length?{ total:allN.length,results:allN }:null,
    meta:{ endpoints:{ home:"GET /novel/home",hotSearch:"GET /novel/hot-search",search:"GET /novel/search?q=keyword",genre:"GET /novel/genre/:id",chapters:"GET /novel/chapters/:novelId" } }
  },"Berhasil mengambil data homepage NovelHub");
}));

router.get("/hot-search", wrap(async(req,res)=>{
  const s=Date.now();
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const page=parseInt(req.query.page)||1;
  const { data:raw, source }=await tryMultiEndpoint([
    { label:BASE_CDN+ENDPOINTS.HOT_SEARCH,    fn:()=>fetchCDN(ENDPOINTS.HOT_SEARCH,{ page,limit }) },
    { label:BASE_CDN+ENDPOINTS.HOT_SEARCH_V2, fn:()=>fetchCDN(ENDPOINTS.HOT_SEARCH_V2,{ page,limit }) },
    { label:BASE_ALT+ENDPOINTS.HOT_SEARCH,    fn:()=>fetchAPI(ENDPOINTS.HOT_SEARCH,{ page,limit }) },
    { label:BASE_CDN+"/api/rank",              fn:()=>fetchCDN("/api/rank",{ page,limit }) },
    { label:BASE_CDN+"/api/hot",               fn:()=>fetchCDN("/api/hot",{ page,limit }) },
    { label:BASE_CDN+"/api/popular",           fn:()=>fetchCDN("/api/popular",{ page,limit }) },
  ]);
  const payload=raw?.data||raw?.result||raw?.response||raw||{};
  const kwRaw=payload.keywords||payload.hotKeywords||payload.searchTerms||payload.trending||[];
  const keywords=Array.isArray(kwRaw)?kwRaw.map((k)=>typeof k==="string"?{ keyword:k,count:null,rank:null }:{ keyword:k.keyword||k.word||k.name||String(k),count:k.count||k.heat||null,rank:k.rank||null }):[];
  const nvRaw=payload.novels||payload.books||payload.list||payload.items||payload.data||[];
  const novels=Array.isArray(nvRaw)?nvRaw.map((n)=>normalizeNovel(n)).filter(Boolean):[];
  const flat=[]; if(!novels.length&&Array.isArray(payload)) payload.forEach((i)=>{ if(typeof i==="string") keywords.push({ keyword:i,count:null,rank:null }); else if(i?.title||i?.name){ const n=normalizeNovel(i); if(n) flat.push(n); } });
  if(!keywords.length&&!novels.length&&!flat.length) return sendError(res,"Tidak ada data hot search ditemukan",404);
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source, page, limit,
    hotKeywords:keywords.length?{ total:keywords.length,items:keywords.slice(0,limit) }:null,
    hotNovels:(novels.length||flat.length)?{ total:novels.length||flat.length,results:(novels.length?novels:flat).slice(0,limit) }:null
  },"Berhasil mengambil "+keywords.length+" hot search keyword NovelHub");
}));

router.get("/search", wrap(async(req,res)=>{
  const q=(req.query.q||req.query.keyword||req.query.s||req.query.query||"").trim();
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const type=req.query.type||""; const status=req.query.status||""; const order=req.query.order||"";
  if(!q) return sendError(res,"Parameter ?q= tidak boleh kosong",400);
  const s=Date.now();
  const sp={ keyword:q,q,s:q,query:q,page,limit,size:limit,pageSize:limit,...(type&&{ type }),...(status&&{ status }),...(order&&{ order,orderBy:order,sort:order }) };
  const { data:raw, source }=await tryMultiEndpoint([
    { label:BASE_CDN+ENDPOINTS.SEARCH,    fn:()=>fetchCDN(ENDPOINTS.SEARCH,sp) },
    { label:BASE_CDN+ENDPOINTS.SEARCH_V2, fn:()=>fetchCDN(ENDPOINTS.SEARCH_V2,sp) },
    { label:BASE_ALT+ENDPOINTS.SEARCH,    fn:()=>fetchAPI(ENDPOINTS.SEARCH,sp) },
    { label:BASE_CDN+"/api/v1/search",    fn:()=>fetchURL(BASE_CDN+"/api/v1/search",sp) },
    { label:BASE_CDN+"/api/search/book",  fn:()=>fetchCDN("/api/search/book",sp) },
    { label:BASE_CDN+"/api/search/novel", fn:()=>fetchCDN("/api/search/novel",sp) },
  ]);
  const payload=raw?.data||raw?.result||raw?.response||raw?.results||raw?.list||raw||{};
  const listRaw=Array.isArray(payload)?payload:payload.list||payload.items||payload.novels||payload.books||payload.results||payload.data||[];
  const novels=listRaw.map((n)=>normalizeNovel(n)).filter((n)=>n&&n.title);
  if(!novels.length) return sendError(res,"Tidak ada novel ditemukan untuk keyword: \""+q+"\"",404);
  const total=payload.total||payload.totalCount||novels.length;
  const tp=payload.totalPage||payload.total_page||Math.ceil(total/limit)||1;
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    keyword:q, filters:{ type:type||null,status:status||null,order:order||null },
    pagination:{ page,limit,total,totalPages:tp,hasNextPage:page<tp,hasPrevPage:page>1 },
    total:novels.length, results:novels
  },"Ditemukan "+novels.length+" novel untuk: \""+q+"\" (halaman "+page+")");
}));

const KNOWN_GENRES=[
  { id:"1",name:"Action",slug:"action" },{ id:"2",name:"Adventure",slug:"adventure" },
  { id:"3",name:"Comedy",slug:"comedy" },{ id:"4",name:"Drama",slug:"drama" },
  { id:"5",name:"Fantasy",slug:"fantasy" },{ id:"6",name:"Horror",slug:"horror" },
  { id:"7",name:"Isekai",slug:"isekai" },{ id:"8",name:"Magic",slug:"magic" },
  { id:"9",name:"Mystery",slug:"mystery" },{ id:"10",name:"Romance",slug:"romance" },
  { id:"11",name:"Sci-fi",slug:"sci-fi" },{ id:"12",name:"Slice of Life",slug:"slice-of-life" },
  { id:"13",name:"Supernatural",slug:"supernatural" },{ id:"14",name:"Thriller",slug:"thriller" },
  { id:"15",name:"Wuxia",slug:"wuxia" },{ id:"16",name:"Xianxia",slug:"xianxia" },
  { id:"17",name:"Xuanhuan",slug:"xuanhuan" },{ id:"18",name:"Martial Arts",slug:"martial-arts" },
  { id:"19",name:"Historical",slug:"historical" },{ id:"20",name:"System",slug:"system" },
  { id:"21",name:"Reincarnation",slug:"reincarnation" },{ id:"22",name:"Harem",slug:"harem" },
  { id:"23",name:"School Life",slug:"school-life" },{ id:"24",name:"Psychological",slug:"psychological" },
  { id:"25",name:"Tragedy",slug:"tragedy" },{ id:"26",name:"Game",slug:"game" }
];

router.get("/genre/:id", wrap(async(req,res)=>{
  const rawId=req.params.id;
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||20,50);
  const order=req.query.order||"latest";
  const status=req.query.status||"";
  const s=Date.now();
  if(!rawId){
    try{
      const { data:gr,source }=await tryMultiEndpoint([
        { label:BASE_CDN+ENDPOINTS.GENRE_LIST,  fn:()=>fetchCDN(ENDPOINTS.GENRE_LIST) },
        { label:BASE_CDN+ENDPOINTS.GENRE_NOVEL, fn:()=>fetchCDN(ENDPOINTS.GENRE_NOVEL) },
        { label:BASE_ALT+"/api/genre",           fn:()=>fetchAPI("/api/genre") },
      ]);
      const gp=gr?.data||gr?.result||gr||[];
      const gl=Array.isArray(gp)?gp.map((g)=>normalizeGenreObj(g)).filter(Boolean):KNOWN_GENRES.map((g)=>({ ...g,icon:null,count:null }));
      return sendSuccess(res,{ timestamp:getTimestamp(),source,total:gl.length,genres:gl },"Berhasil mengambil "+gl.length+" genre novel");
    }catch{
      return sendSuccess(res,{ timestamp:getTimestamp(),source:"fallback",total:KNOWN_GENRES.length,genres:KNOWN_GENRES.map((g)=>({ ...g,icon:null,count:null })) },"Daftar genre (data fallback)");
    }
  }
  const kn=KNOWN_GENRES.find((g)=>g.id===rawId||g.slug===rawId.toLowerCase()||g.name.toLowerCase()===rawId.toLowerCase());
  const gp={ id:rawId,genre:rawId,genreId:rawId,page,limit,size:limit,pageSize:limit,order,orderBy:order,...(status&&{ status }) };
  const { data:raw, source }=await tryMultiEndpoint([
    { label:BASE_CDN+ENDPOINTS.GENRE_LIST+"/"+rawId,  fn:()=>fetchURL(BASE_CDN+ENDPOINTS.GENRE_LIST+"/"+rawId,{ page,limit,order }) },
    { label:BASE_CDN+"/api/genre/novel/"+rawId,        fn:()=>fetchURL(BASE_CDN+"/api/genre/novel/"+rawId,{ page,limit }) },
    { label:BASE_CDN+ENDPOINTS.GENRE_NOVEL,            fn:()=>fetchCDN(ENDPOINTS.GENRE_NOVEL,gp) },
    { label:BASE_CDN+"/api/novel/genre",               fn:()=>fetchCDN("/api/novel/genre",gp) },
    { label:BASE_CDN+"/api/v2/genre/novel",            fn:()=>fetchCDN("/api/v2/genre/novel",gp) },
    { label:BASE_ALT+"/api/genre/"+rawId,              fn:()=>fetchURL(BASE_ALT+"/api/genre/"+rawId,{ page,limit }) },
    { label:BASE_CDN+"/api/books",                     fn:()=>fetchCDN("/api/books",gp) },
  ]);
  const payload=raw?.data||raw?.result||raw?.response||raw?.list||raw||{};
  const listRaw=Array.isArray(payload)?payload:payload.list||payload.items||payload.novels||payload.books||payload.results||payload.data||[];
  const novels=listRaw.map((n)=>normalizeNovel(n)).filter((n)=>n&&n.title);
  if(!novels.length) return sendError(res,"Tidak ada novel ditemukan untuk genre ID: \""+rawId+"\"",404);
  const genreInfo=normalizeGenreObj(payload.genre||payload.genreInfo||kn||{ id:rawId,name:rawId });
  const total=payload.total||payload.totalCount||novels.length;
  const tp=payload.totalPage||payload.total_page||Math.ceil(total/limit)||1;
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    genre:genreInfo, filters:{ order,status:status||null },
    pagination:{ page,limit,total,totalPages:tp,hasNextPage:page<tp,hasPrevPage:page>1 },
    total:novels.length, results:novels
  },"Berhasil mengambil "+novels.length+" novel genre \"+(genreInfo?.name||rawId)+"\" halaman "+page);
}));

router.get("/chapters/:novelId", wrap(async(req,res)=>{
  const { novelId }=req.params;
  const page=parseInt(req.query.page)||1;
  const limit=Math.min(parseInt(req.query.limit)||50,200);
  const order=req.query.order||"asc";
  const s=Date.now();
  const cp={ id:novelId,novelId,novel_id:novelId,bookId:novelId,book_id:novelId,page,limit,size:limit,pageSize:limit,order,orderBy:order,sort:order };
  const { data:raw, source }=await tryMultiEndpoint([
    { label:BASE_CDN+ENDPOINTS.CHAPTERS+"/"+novelId,    fn:()=>fetchURL(BASE_CDN+ENDPOINTS.CHAPTERS+"/"+novelId,{ page,limit,order }) },
    { label:BASE_CDN+ENDPOINTS.CHAPTER_LIST+"/"+novelId, fn:()=>fetchURL(BASE_CDN+ENDPOINTS.CHAPTER_LIST+"/"+novelId,{ page,limit,order }) },
    { label:BASE_CDN+ENDPOINTS.CHAPTERS,                 fn:()=>fetchCDN(ENDPOINTS.CHAPTERS,cp) },
    { label:BASE_CDN+ENDPOINTS.CHAPTER_LIST,             fn:()=>fetchCDN(ENDPOINTS.CHAPTER_LIST,cp) },
    { label:BASE_CDN+"/api/novel/"+novelId+"/chapters",  fn:()=>fetchURL(BASE_CDN+"/api/novel/"+novelId+"/chapters",{ page,limit }) },
    { label:BASE_CDN+"/api/v2/chapters/"+novelId,        fn:()=>fetchURL(BASE_CDN+"/api/v2/chapters/"+novelId,{ page,limit }) },
    { label:BASE_CDN+"/api/book/"+novelId+"/chapter",    fn:()=>fetchURL(BASE_CDN+"/api/book/"+novelId+"/chapter",{ page,limit }) },
    { label:BASE_ALT+"/api/chapters/"+novelId,           fn:()=>fetchURL(BASE_ALT+"/api/chapters/"+novelId,{ page,limit }) },
    { label:BASE_CDN+"/api/v1/chapters",                 fn:()=>fetchURL(BASE_CDN+"/api/v1/chapters",cp) },
  ]);
  const payload=raw?.data||raw?.result||raw?.response||raw?.list||raw||{};
  const novelInfoRaw=payload.novel||payload.book||payload.info||null;
  const novelInfo=novelInfoRaw?normalizeNovel(novelInfoRaw):{ id:novelId,title:payload.title||payload.name||null,cover:payload.cover||null };
  const chListRaw=Array.isArray(payload)?payload:payload.chapters||payload.chapterList||payload.list||payload.items||payload.data||[];
  let chapters=normalizeChapterList(chListRaw);
  if(order==="desc") chapters.sort((a,b)=>(parseFloat(b.number)||0)-(parseFloat(a.number)||0));
  else chapters.sort((a,b)=>(parseFloat(a.number)||0)-(parseFloat(b.number)||0));
  if(!chapters.length) return sendError(res,"Tidak ada chapter ditemukan untuk novel ID: \""+novelId+"\"",404);
  const total=payload.total||payload.totalCount||chapters.length;
  const tp=payload.totalPage||payload.total_page||Math.ceil(total/limit)||1;
  const lat=chapters.reduce((a,b)=>(parseFloat(a?.number)||0)>(parseFloat(b?.number)||0)?a:b,null);
  const fst=chapters.reduce((a,b)=>(parseFloat(a?.number)||Infinity)<(parseFloat(b?.number)||Infinity)?a:b,null);
  const prem=chapters.filter((c)=>c.isPremium||c.isLocked).length;
  sendSuccess(res,{
    timestamp:getTimestamp(), responseTimeMs:Date.now()-s, source,
    novel:novelInfo, order,
    pagination:{ page,limit,total,totalPages:tp,hasNextPage:page<tp,hasPrevPage:page>1 },
    summary:{ totalChapters:chapters.length,freeChapters:chapters.length-prem,premiumChapters:prem,firstChapter:fst?normalizeChapter(fst):null,latestChapter:lat?normalizeChapter(lat):null },
    chapters
  },"Berhasil mengambil "+chapters.length+" chapter novel ID \""+novelId+"\" halaman "+page);
}));

module.exports = router;
