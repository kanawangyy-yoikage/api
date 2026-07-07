// api/index.js — Main Entry Point — Creator: matchadesu_
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization,x-access-token,x-refresh-token,x-user-id");
  res.setHeader("X-Creator","matchadesu_");
  res.setHeader("X-API-Version","1.0.0");
  res.setHeader("X-Powered-By","matchadesu_ REST API");
  if(req.method==="OPTIONS") return res.sendStatus(200);
  next();
});

app.use((req,res,next)=>{
  const s=Date.now();
  res.on("finish",()=>console.log("["+new Date().toISOString()+"] "+req.method+" "+req.path+" -> "+res.statusCode+" ("+(Date.now()-s)+"ms)"));
  next();
});

app.use("/anime",    require("../routes/anime"));
app.use("/nekopoi",  require("../routes/nekopoi"));
app.use("/comic",    require("../routes/comic"));
app.use("/novel",    require("../routes/novel"));
app.use("/dramabox", require("../routes/dramabox"));

app.get("/",(req,res)=>res.json({
  status:"success",creator:"matchadesu_",statusCode:200,statusMessage:"OK",
  message:"Selamat datang di matchadesu_ REST API 🎉",ok:true,
  data:{
    name:"matchadesu_ All-in-One REST API",version:"1.0.0",creator:"matchadesu_",
    uptime:process.uptime().toFixed(2)+"s",timestamp:new Date().toISOString(),
    endpoints:{ anime:"/anime/*",nekopoi:"/nekopoi/*",comic:"/comic/*",novel:"/novel/*",dramabox:"/dramabox/*" }
  }
}));

app.use((req,res)=>res.status(404).json({
  status:"failed",creator:"matchadesu_",statusCode:404,statusMessage:"Not Found",
  message:"Endpoint \""+req.method+" "+req.path+"\" tidak ditemukan",ok:false,
  data:{ hint:"Cek dokumentasi di GET /",available:["/anime/*","/nekopoi/*","/comic/*","/novel/*","/dramabox/*"] }
}));

app.use((err,req,res,_next)=>{
  console.error("Global Error:",err);
  res.status(500).json({ status:"failed",creator:"matchadesu_",statusCode:500,
    statusMessage:"Internal Server Error",message:err.message||"Kesalahan internal",ok:false,data:null });
});

module.exports = app;
