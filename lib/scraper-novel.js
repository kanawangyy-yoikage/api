// lib/scraper-novel.js — NovelHub — Creator: matchadesu_
const axios      = require("axios");
const axiosRetry = require("axios-retry").default;
const UserAgent  = require("user-agents");

const BASE_CDN = "https://nacdn.novelhubapp.com";
const BASE_APP = "https://novelhubapp.com";
const BASE_ALT = "https://api.novelhubapp.com";
const ENDPOINTS = {
  HOME:"/api/home", HOME_V2:"/api/v2/home",
  SEARCH:"/api/search", SEARCH_V2:"/api/v2/search",
  HOT_SEARCH:"/api/hot-search", HOT_SEARCH_V2:"/api/v2/hot-search",
  GENRE_LIST:"/api/genre", GENRE_NOVEL:"/api/genre/novel",
  CHAPTERS:"/api/chapters", CHAPTER_LIST:"/api/chapter-list"
};

function makeClient(baseURL){
  const c=axios.create({ baseURL, timeout:20000,
    headers:{ Accept:"application/json,text/plain,*/*","Content-Type":"application/json",
      "Accept-Language":"id-ID,id;q=0.9,en;q=0.7",
      Origin:BASE_APP, Referer:BASE_APP+"/","X-Requested-With":"XMLHttpRequest" }
  });
  axiosRetry(c,{ retries:4, retryDelay:(n)=>n*1500,
    retryCondition:(e)=>axiosRetry.isNetworkOrIdempotentRequestError(e)||[429,500,502,503,504].includes(e.response?.status) });
  c.interceptors.request.use((cfg)=>{ cfg.headers["User-Agent"]=new UserAgent({deviceCategory:"desktop"}).toString(); return cfg; });
  return c;
}
const cdnClient=makeClient(BASE_CDN);
const apiClient=makeClient(BASE_ALT);

async function fetchCDN(path,params={}){ return (await cdnClient.get(path,{params})).data; }
async function fetchAPI(path,params={}){ return (await apiClient.get(path,{params})).data; }
async function fetchURL(url,params={}){
  try{
    const u=new URL(url);
    const c=makeClient(u.origin);
    return (await c.get(u.pathname+(u.search||""),{params})).data;
  }catch(e){ throw new Error("fetchURL gagal: "+e.message); }
}
async function tryMultiEndpoint(targets){
  const errors=[];
  for(const { fn, label } of targets){
    try{ const data=await fn(); if(data!=null) return { data, source:label }; }
    catch(e){ errors.push("["+label+"]: "+e.message); }
  }
  throw new Error("Semua endpoint gagal:\n"+errors.join("\n"));
}
function normalizeNovel(raw){
  if(!raw) return null;
  const cover=raw.cover||raw.coverUrl||raw.cover_url||raw.image||raw.img||null;
  return {
    id:raw.id||raw.novel_id||raw.bookId||null,
    title:raw.title||raw.name||raw.bookName||raw.novel_name||"Unknown",
    cover:cover&&cover.startsWith("http")?cover:cover?BASE_CDN+cover:null,
    author:raw.author||raw.author_name||null,
    description:raw.description||raw.desc||raw.intro||raw.synopsis||null,
    status:raw.status||null,
    genres:Array.isArray(raw.genre)?raw.genre.map((g)=>typeof g==="string"?g:g.name||"").filter(Boolean):[],
    rating:raw.rating||raw.score||null,
    views:raw.views||raw.view_count||null,
    totalChapters:raw.totalChapters||raw.total_chapters||raw.chapterCount||null,
    latestChapter:raw.lastChapter||raw.latest_chapter||null,
    updatedAt:raw.updatedAt||raw.updated_at||raw.update_time||null,
    language:raw.language||"ID", source:BASE_CDN
  };
}
function normalizeGenreObj(raw){
  if(!raw) return null;
  return { id:raw.id||raw.genre_id||null, name:raw.name||raw.genre_name||raw.label||"Unknown",
    slug:raw.slug||raw.code||null, icon:raw.icon||raw.image||null, count:raw.count||null };
}
function normalizeChapterList(rawList){
  if(!rawList) return [];
  const arr=Array.isArray(rawList)?rawList:rawList.list||rawList.chapters||rawList.data||[];
  return arr.map((ch,i)=>({
    id:ch.id||ch.chapter_id||i+1,
    title:ch.title||ch.chapter_title||ch.name||("Chapter "+(i+1)),
    number:ch.number||ch.chapter_no||i+1,
    url:ch.url||ch.link||null,
    isPremium:ch.isPremium||ch.is_premium||false,
    isLocked:ch.isLocked||ch.is_locked||false,
    views:ch.views||ch.view_count||null,
    date:ch.date||ch.updated_at||ch.create_time||null
  }));
}
function normalizeChapter(raw){
  if(!raw) return null;
  if(typeof raw==="string"||typeof raw==="number") return { id:null, title:String(raw), number:null };
  return { id:raw.id||null, title:raw.title||raw.chapter_title||null, number:raw.number||raw.chapter_no||null, url:raw.url||null, date:raw.date||null };
}
function getTimestamp(){ return new Date().toISOString(); }
module.exports = { fetchCDN, fetchAPI, fetchURL, tryMultiEndpoint, normalizeNovel, normalizeGenreObj, normalizeChapterList, normalizeChapter, getTimestamp, ENDPOINTS, BASE_CDN, BASE_APP, BASE_ALT };
