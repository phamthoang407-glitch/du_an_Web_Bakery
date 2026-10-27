const {db}=require("../config/database");
function getItems(orderId){return db.prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id").all(orderId);}
function get(id,user){
  const o=user.role==="CUSTOMER"
    ? db.prepare("SELECT * FROM orders WHERE id=? AND user_id=?").get(id,user.id)
    : db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if(!o)return null;o.items=getItems(o.id);return o;
}
function list(user){
  const sql=user.role==="CUSTOMER"
    ?"SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id=o.id) AS item_count FROM orders o WHERE user_id=? ORDER BY id DESC"
    :"SELECT o.*, u.full_name AS account_name, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id=o.id) AS item_count FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC";
  return user.role==="CUSTOMER" ? db.prepare(sql).all(user.id) : db.prepare(sql).all();
}
function create(user,data){
  const cart=db.prepare(`
    SELECT ci.product_id,ci.quantity,p.name,p.price
    FROM cart_items ci JOIN carts c ON c.id=ci.cart_id
    JOIN products p ON p.id=ci.product_id WHERE c.user_id=?
  `).all(user.id);
  if(!cart.length){const e=new Error("Giỏ hàng đang trống.");e.status=400;throw e;}
  const total=cart.reduce((s,x)=>s+x.price*x.quantity,0);
  const code="BK-"+Date.now().toString().slice(-8);
  const tx=db.transaction(()=>{
    const r=db.prepare(`
      INSERT INTO orders(code,user_id,customer_name,customer_phone,shipping_address,payment_method,status,total_amount)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(code,user.id,data.customer_name,data.customer_phone,data.shipping_address,data.payment_method||"COD","PENDING",total);
    for(const x of cart) db.prepare("INSERT INTO order_items(order_id,product_id,product_name,price,quantity) VALUES(?,?,?,?,?)").run(r.lastInsertRowid,x.product_id,x.name,x.price,x.quantity);
    const c=db.prepare("SELECT id FROM carts WHERE user_id=?").get(user.id);
    db.prepare("DELETE FROM cart_items WHERE cart_id=?").run(c.id);
    return r.lastInsertRowid;
  });
  return get(tx(),user);
}
function updateStatus(id,status){
  const allowed=["PENDING","CONFIRMED","PROCESSING","SHIPPING","COMPLETED","CANCELLED"];
  if(!allowed.includes(status)){const e=new Error("Trạng thái đơn hàng không hợp lệ.");e.status=400;throw e;}
  const r=db.prepare("UPDATE orders SET status=? WHERE id=?").run(status,id);
  if(!r.changes){const e=new Error("Không tìm thấy đơn hàng.");e.status=404;throw e;}
  return db.prepare("SELECT * FROM orders WHERE id=?").get(id);
}
module.exports={list,get,create,updateStatus};
