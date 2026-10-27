const auth = require("../services/auth.service");

function login(req, res, next) {
  try {
    const { identifier, email, phone, password } = req.body || {};
    const result = auth.login(identifier || email || phone, password);
    if (!result) return res.status(401).json({ success: false, message: "Sai email/số điện thoại hoặc mật khẩu." });
    res.json({ success: true, message: "Đăng nhập thành công.", data: result });
  } catch (e) { next(e); }
}

function register(req, res, next) {
  try {
    const result = auth.register(req.body || {});
    res.status(201).json({ success: true, message: "Đăng ký thành công.", data: result });
  } catch (e) { next(e); }
}

function me(req, res) {
  res.json({ success: true, message: "Success", data: req.user });
}

function logout(req, res) {
  res.json({ success: true, message: "Đăng xuất thành công.", data: null });
}
module.exports = { login, register, me, logout };
