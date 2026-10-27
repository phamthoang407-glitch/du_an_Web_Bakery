const { db } = require("../config/database");

function list({ category, search } = {}) {
  let sql = `
    SELECT p.*, c.name AS category
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE 1=1
  `;
  const params = [];
  if (category) { sql += " AND c.name=?"; params.push(category); }
  if (search) { sql += " AND lower(p.name) LIKE lower(?)"; params.push(`%${search}%`); }
  sql += " ORDER BY p.id";
  return db.prepare(sql).all(...params);
}
function get(id) {
  return db.prepare(`
    SELECT p.*, c.name AS category
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=?
  `).get(id);
}
function create(data) {
  const category = db.prepare("SELECT id FROM categories WHERE id=?").get(data.category_id);
  if (!category) { const e=new Error("Danh mục không tồn tại."); e.status=400; throw e; }
  const r = db.prepare(`
    INSERT INTO products(name,category_id,price,old_price,rating,status,image,description)
    VALUES(?,?,?,?,?,?,?,?)
  `).run(data.name,data.category_id,data.price,data.old_price||0,data.rating||5,data.status||"Còn hàng",data.image||"",data.description||"");
  return get(r.lastInsertRowid);
}
function update(id,data) {
  const old=get(id); if(!old){const e=new Error("Không tìm thấy sản phẩm.");e.status=404;throw e;}
  const category_id=data.category_id ?? old.category_id;
  db.prepare(`
    UPDATE products SET name=?,category_id=?,price=?,old_price=?,rating=?,status=?,image=?,description=? WHERE id=?
  `).run(data.name??old.name,category_id,data.price??old.price,data.old_price??old.old_price,data.rating??old.rating,data.status??old.status,data.image??old.image,data.description??old.description,id);
  return get(id);
}
function remove(id) {
  const r=db.prepare("DELETE FROM products WHERE id=?").run(id);
  if(!r.changes){const e=new Error("Không tìm thấy sản phẩm.");e.status=404;throw e;}
}
module.exports={list,get,create,update,remove};
