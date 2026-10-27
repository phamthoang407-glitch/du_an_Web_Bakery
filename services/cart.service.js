const {db}=require("../config/database");
function ensureCart(userId){let c=db.prepare("SELECT * FROM carts WHERE user_id=?").get(userId);if(!c){const r=db.prepare("INSERT INTO carts(user_id) VALUES(?)").run(userId);c={id:r.lastInsertRowid,user_id:userId};}return c;}
function get(userId){
  const c=ensureCart(userId);
  return db.prepare(`
    SELECT ci.id,ci.product_id,ci.quantity, p.name,p.price,p.image,p.status
    FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY ci.id
  `).all(c.id);
}
function add(userId,productId,quantity=1){
  const c=ensureCart(userId);
  const p=db.prepare("SELECT id FROM products WHERE id=?").get(productId);
  if(!p){const e=new Error("Không tìm thấy sản phẩm.");e.status=404;throw e;}
  const existing=db.prepare("SELECT * FROM cart_items WHERE cart_id=? AND product_id=?").get(c.id,productId);
  if(existing) db.prepare("UPDATE cart_items SET quantity=? WHERE id=?").run(existing.quantity+quantity,existing.id);
  else db.prepare("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES(?,?,?)").run(c.id,productId,quantity);
  return get(userId);
}
function update(userId,itemId,quantity){
  const c=ensureCart(userId);
  if(quantity<=0){db.prepare("DELETE FROM cart_items WHERE id=? AND cart_id=?").run(itemId,c.id);}
  else {const r=db.prepare("UPDATE cart_items SET quantity=? WHERE id=? AND cart_id=?").run(quantity,itemId,c.id);if(!r.changes){const e=new Error("Không tìm thấy sản phẩm trong giỏ.");e.status=404;throw e;}}
  return get(userId);
}
function remove(userId,itemId){const c=ensureCart(userId);db.prepare("DELETE FROM cart_items WHERE id=? AND cart_id=?").run(itemId,c.id);return get(userId);}
function clear(userId){const c=ensureCart(userId);db.prepare("DELETE FROM cart_items WHERE cart_id=?").run(c.id);return [];}
module.exports={get,add,update,remove,clear};
