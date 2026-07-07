// lib/response.js — Creator: matchadesu_
const HTTP = {
  200:"OK",201:"Created",400:"Bad Request",401:"Unauthorized",
  403:"Forbidden",404:"Not Found",405:"Method Not Allowed",
  409:"Conflict",429:"Too Many Requests",
  500:"Internal Server Error",503:"Service Unavailable"
};
function sendSuccess(res, data, message = "Request berhasil", code = 200) {
  return res.status(code).json({
    status:"success", creator:"matchadesu_",
    statusCode:code, statusMessage:HTTP[code]||"OK",
    message, ok:true, data
  });
}
function sendError(res, message = "Terjadi kesalahan", code = 500, data = null) {
  return res.status(code).json({
    status:"failed", creator:"matchadesu_",
    statusCode:code, statusMessage:HTTP[code]||"Error",
    message, ok:false, data
  });
}
module.exports = { sendSuccess, sendError };
