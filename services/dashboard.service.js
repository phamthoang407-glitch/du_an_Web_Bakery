const {db}=require("../config/database");
function get(){
  const today=new Date().toISOString().slice(0,10);
  const revenue=db.prepare("SELECT COALESCE(SUM(total_amount),0) total FROM orders WHERE status!='CANCELLED' AND date(created_at)=?").get(today).total;
  const ordersToday=db.prepare("SELECT COUNT(*) count FROM orders WHERE date(created_at)=?").get(today).count;
  const customers=db.prepare("SELECT COUNT(*) count FROM users WHERE role='CUSTOMER'").get().count;
  const products=db.prepare("SELECT COUNT(*) count FROM products").get().count;
  const recent=db.prepare(`
    SELECT o.id,o.code,o.customer_name,o.total_amount,o.status,o.created_at
    FROM orders o ORDER BY o.id DESC LIMIT 8
  `).all();
  const best=db.prepare(`
    SELECT oi.product_id,oi.product_name,SUM(oi.quantity) sold,MAX(oi.price) price
    FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE o.status!='CANCELLED' GROUP BY oi.product_id,oi.product_name ORDER BY sold DESC LIMIT 5
  `).all();
  const revenue7=db.prepare(`
    SELECT date(created_at) day,COALESCE(SUM(total_amount),0) total
    FROM orders WHERE status!='CANCELLED' AND date(created_at)>=date('now','-6 day')
    GROUP BY date(created_at) ORDER BY day
  `).all();
  return {revenue_today:revenue,orders_today:ordersToday,customers,products,recent_orders:recent,best_products:best,revenue_7_days:revenue7};
}
module.exports={get};
