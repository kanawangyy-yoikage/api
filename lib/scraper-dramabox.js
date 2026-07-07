// lib/scraper-dramabox.js — DramaBox — Creator: matchadesu_
const axios      = require("axios");
const axiosRetry = require("axios-retry").default;
const UserAgent  = require("user-agents");

const BASE_WEB    = "https://dramabox.com";
const BASE_API    = "https://dramabox.com/api";
const BASE_API_V1 = "https://dramabox.com/api/v1";
const BASE_API_V2 = "https://dramabox.com/api/v2";
const BASE_CDN    = "https://cdn.dramabox.com";

const ENDPOINTS = {
  AUTH_GUEST:"/user/guest-login", AUTH_REFRESH:"/user/token-refresh",
  HOME:"/home", LATEST:"/drama/latest", TRENDING:"/drama/trending",
  HOT:"/drama/hot", POPULAR:"/drama/popular", RANK:"/drama/rank",
  NEW_RELEASE:"/drama/new-release", SEARCH:"/search", SEARCH_V2:"/search/drama",
  DETAIL:"/drama/detail", EPISODES:"/drama/episodes",
  EPISODE_LIST:"/episode/list", EPISODE_DETAIL:"/episode/detail",
  STREAM:"/episode/stream", STREAM_V2:"/stream/url",
  PLAY_URL:"/episode/play", VIDEO_INFO:"/video/info", SOURCE:"/episode/source"
};

function generateDeviceId(){
  const c="abcdef0123456789"; let id="";
  for(let i=0;i<32;i++) id+=c[Math.floor(Math.random()*c.length)];
  return id.slice(0,8)+"-"+id.slice(8,12)+"-"+id.slice(12,16)+"-"+id.slice(16,20)+"-"+id.slice(20);
}

const tokenStore = {
  accessToken:null, refreshToken:null,
  expiresAt:null, deviceId:generateDeviceId(), userId:null
};

function getDefaultHeaders(withAuth=false){
  const h = {
    Accept:"application/json,text/plain,*/*","Content-Type":"application/json",
    "Accept-Language":"en-US,en;q=0.9,id;q=0.8",
    "User-Agent":new UserAgent({deviceCategory:"desktop"}).toString(),
    Referer:BASE_WEB+"/", Origin:BASE_WEB,
    "X-Device-Id":tokenStore.deviceId,"X-Platform":"web",
    "X-App-Version":"1.0.0","X-Region":"ID","X-Language":"id"
  };
  if(withAuth&&tokenStore.accessToken){
    h.Authorization="Bearer "+tokenStore.accessToken;
    h["X-Access-Token"]=tokenStore.accessToken;
  }
  return h;
}
function createClient(baseURL,withAuth=false){
  const c=axios.create({ baseURL, timeout:25000, maxRedirects:5, headers:getDefaultHeaders(withAuth) });
  axiosRetry(c,{ retries:4, retryDelay:(n)=>n*2000,
    retryCondition:(e)=>axiosRetry.isNetworkOrIdempotentRequestError(e)||[429,500,502,503,504].includes(e.response?.status) });
  c.interceptors.request.use((cfg)=>{ cfg.headers["User-Agent"]=new UserAgent({deviceCategory:"desktop"}).toString(); return cfg; });
  return c;
}
async function guestLogin(){
  const payload={ deviceId:tokenStore.deviceId,device_id:tokenStore.deviceId,platform:"web",language:"id",region:"ID" };
  for(const [base,path] of [[BASE_API_V1,ENDPOINTS.AUTH_GUEST],[BASE_API_V2,ENDPOINTS.AUTH_GUEST],[BASE_API_V1,"/auth/guest"]]){
    try{
      const res=await createClient(base,false).post(path,payload);
      const data=res.data?.data||res.data?.result||res.data||{};
      const token=data.accessToken||data.access_token||data.token||null;
      if(token){
        tokenStore.accessToken=token;
        tokenStore.refreshToken=data.refreshToken||data.refresh_token||null;
        tokenStore.expiresAt=Date.now()+((data.expiresIn||3600)*1000);
        tokenStore.userId=data.userId||null;
        return token;
      }
    }catch{ /* continue */ }
  }
  return null;
}
async function refreshAccessToken(refreshToken){
  const payload={ refreshToken, refresh_token:refreshToken, deviceId:tokenStore.deviceId };
  for(const base of [BASE_API_V1,BASE_API_V2]){
    try{
      const res=await createClient(base,false).post(ENDPOINTS.AUTH_REFRESH,payload);
      const data=res.data?.data||res.data?.result||res.data||{};
      const tok=data.accessToken||data.access_token||data.token||null;
      if(tok){
        tokenStore.accessToken=tok;
        tokenStore.refreshToken=data.refreshToken||data.refresh_token||refreshToken;
        tokenStore.expiresAt=Date.now()+((data.expiresIn||3600)*1000);
        return { accessToken:tok, refreshToken:tokenStore.refreshToken, expiresAt:tokenStore.expiresAt };
      }
    }catch{ /* continue */ }
  }
  throw new Error("Gagal refresh token");
}
async function ensureToken(){
  if(tokenStore.accessToken&&tokenStore.expiresAt&&Date.now()<tokenStore.expiresAt-60000) return tokenStore.accessToken;
  if(tokenStore.refreshToken){ try{ const r=await refreshAccessToken(tokenStore.refreshToken); if(r?.accessToken) return r.accessToken; }catch{} }
  return await guestLogin();
}
async function tryEndpoints(targets){
  const errors=[];
  for(const { label, fn } of targets){
    try{ const data=await fn(); if(data!=null) return { data, source:label }; }
    catch(e){ errors.push("["+label+"]: "+e.message); }
  }
  throw new Error("Semua endpoint gagal:\n"+errors.join("\n"));
}
async function fetchWithAuth(path,params={},method="GET",body=null){
  await ensureToken();
  const c=createClient(BASE_API_V1,true);
  const cfg={ params, headers:getDefaultHeaders(true) };
  if(method==="POST") return (await c.post(path,body||params,cfg)).data;
  return (await c.get(path,cfg)).data;
}
async function fetchPublic(baseURL,path,params={}){
  return (await createClient(baseURL,false).get(path,{params})).data;
}
function normalizeDrama(raw){
  if(!raw) return null;
  const cover=raw.cover||raw.coverUrl||raw.poster||null;
  return {
    id:raw.id||raw.drama_id||raw.seriesId||null,
    title:raw.title||raw.name||raw.dramaName||"Unknown",
    cover:cover&&cover.startsWith("http")?cover:cover?BASE_CDN+cover:null,
    description:raw.description||raw.desc||raw.intro||null,
    genre:Array.isArray(raw.genre)?raw.genre.map((g)=>typeof g==="string"?g:g.name||"").filter(Boolean):
          typeof raw.genre==="string"?raw.genre.split(",").map((g)=>g.trim()):[],
    country:raw.country||raw.nation||null, language:raw.language||raw.lang||null,
    year:raw.year||raw.releaseYear||null, status:raw.status||null,
    totalEpisodes:raw.totalEpisodes||raw.total_episodes||raw.episodeCount||null,
    latestEpisode:raw.latestEpisode||raw.latest_episode||null,
    rating:raw.rating||raw.score||null, views:raw.views||raw.viewCount||null,
    isFree:raw.isFree??raw.is_free??null, isHot:raw.isHot??raw.is_hot??null,
    cast:Array.isArray(raw.cast)?raw.cast.map((c)=>typeof c==="string"?{name:c,role:null}:{name:c.name||null,role:c.role||null}):[],
    updatedAt:raw.updatedAt||raw.updated_at||null, source:BASE_WEB
  };
}
function normalizeEpisode(raw){
  if(!raw) return null;
  return {
    id:raw.id||raw.episode_id||null, dramaId:raw.dramaId||raw.drama_id||null,
    title:raw.title||raw.episodeTitle||raw.name||null,
    number:parseFloat(raw.number||raw.episodeNumber||raw.ep||0)||null,
    cover:raw.cover?.startsWith?.("http")?raw.cover:raw.thumbnail||null,
    duration:raw.duration||null,
    isFree:raw.isFree??raw.is_free??null, isLocked:raw.isLocked??raw.is_locked??null,
    isPremium:raw.isPremium??raw.is_premium??null,
    views:raw.views||null, publishDate:raw.publishDate||raw.date||null
  };
}
function normalizeStreamSource(raw){
  if(!raw) return null;
  return {
    url:raw.url||raw.streamUrl||raw.playUrl||raw.src||null,
    quality:raw.quality||raw.resolution||raw.definition||null,
    format:raw.format||raw.type||"video/mp4",
    expires:raw.expires||raw.expireTime||null,
    subtitles:Array.isArray(raw.subtitles)?raw.subtitles.map((s)=>({ language:s.language||s.lang||null, label:s.label||s.name||null, url:s.url||s.src||null, format:s.format||"srt" })).filter((s)=>s.url):null,
    drm:raw.drm||null, cdn:raw.cdn||null
  };
}
function normalizePagination(raw,page,limit){
  const total=raw?.total||raw?.totalCount||raw?.total_count||0;
  const totalPages=raw?.totalPages||raw?.total_pages||Math.ceil(total/limit)||1;
  return { page, limit, total, totalPages,
    hasNextPage:page<totalPages, hasPrevPage:page>1,
    nextPage:page<totalPages?page+1:null, prevPage:page>1?page-1:null };
}
function getTokenStore(){
  return { hasToken:!!tokenStore.accessToken, hasRefresh:!!tokenStore.refreshToken,
    expiresAt:tokenStore.expiresAt, deviceId:tokenStore.deviceId, userId:tokenStore.userId,
    isExpired:tokenStore.expiresAt?Date.now()>=(tokenStore.expiresAt-60000):true };
}
function getTimestamp(){ return new Date().toISOString(); }
module.exports = {
  fetchWithAuth, fetchPublic, tryEndpoints, ensureToken,
  guestLogin, refreshAccessToken, createClient,
  normalizeDrama, normalizeEpisode, normalizeStreamSource, normalizePagination,
  getTokenStore, getTimestamp, generateDeviceId,
  ENDPOINTS, BASE_WEB, BASE_API, BASE_API_V1, BASE_API_V2, BASE_CDN, tokenStore
};
