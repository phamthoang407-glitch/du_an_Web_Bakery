const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "bakery_shop_dev_secret_change_me";

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
}

function login(identifier, password) {
  const user = db.prepare(
    "SELECT * FROM users WHERE lower(email)=lower(?) OR phone=?"
  ).get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return { token: createToken(user), user: publicUser(user) };
}

function register({ full_name, email, phone, password, address = "" }) {
  if (!full_name || !email || !password) {
    const err = new Error("Họ tên, email và mật khẩu là bắt buộc.");
    err.status = 400;
    throw err;
  }

  const exists = db.prepare("SELECT id FROM users WHERE lower(email)=lower(?) OR phone=?").get(email, phone || null);
  if (exists) {
    const err = new Error("Email hoặc số điện thoại đã tồn tại.");
    err.status = 409;
    throw err;
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users(full_name,email,phone,password_hash,role,address)
    VALUES(?,?,?,?,?,?)
  `).run(full_name, email, phone || null, hash, "CUSTOMER", address);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(result.lastInsertRowid);
  return { token: createToken(user), user: publicUser(user) };
}

function getUser(id) {
  return publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(id));
}

module.exports = { login, register, getUser, JWT_SECRET };
