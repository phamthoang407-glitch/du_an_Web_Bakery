const jwt = require("jsonwebtoken");
const { getUser, JWT_SECRET } = require("../services/auth.service");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Bạn cần đăng nhập." });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = getUser(payload.id);
    if (!user) return res.status(401).json({ success: false, message: "Phiên đăng nhập không còn hợp lệ." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
  }
}
module.exports = { authenticate };
