const { db } = require("../config/database");

/** Dashboard summary sourced from SQLite. Dates use SQLite's localtime modifier
 * consistently so today's numbers and the seven-day chart use the same clock.
 */
function get() {
  const today = db.prepare("SELECT date('now', 'localtime') AS day").get().day;

  const revenueToday = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS total
    FROM orders
    WHERE status != 'CANCELLED' AND date(created_at, 'localtime') = ?
  `).get(today).total;

  const ordersToday = db.prepare(`
    SELECT COUNT(*) AS count
    FROM orders
    WHERE date(created_at, 'localtime') = ?
  `).get(today).count;

  const customers = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'CUSTOMER'").get().count;
  const products = db.prepare("SELECT COUNT(*) AS count FROM products").get().count;

  const recentOrders = db.prepare(`
    SELECT o.id, o.code, o.customer_name, o.total_amount, o.status, o.created_at
    FROM orders o
    ORDER BY o.id DESC
    LIMIT 8
  `).all();

  const bestProducts = db.prepare(`
    SELECT oi.product_id, oi.product_name,
           SUM(oi.quantity) AS sold,
           MAX(oi.price) AS price
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'CANCELLED'
    GROUP BY oi.product_id, oi.product_name
    ORDER BY sold DESC, oi.product_name ASC
    LIMIT 5
  `).all();

  // Return all seven days, including days with zero revenue, so the chart has
  // stable labels and does not silently skip quiet days.
  const revenueRows = db.prepare(`
    SELECT date(created_at, 'localtime') AS day,
           COALESCE(SUM(total_amount), 0) AS total
    FROM orders
    WHERE status != 'CANCELLED'
      AND date(created_at, 'localtime') BETWEEN date(?, '-6 day') AND ?
    GROUP BY date(created_at, 'localtime')
  `).all(today, today);
  const revenueByDay = new Map(revenueRows.map(row => [row.day, row.total]));
  const revenue7Days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = db.prepare("SELECT date(?, ?) AS day").get(today, `-${offset} day`).day;
    revenue7Days.push({ day, total: revenueByDay.get(day) || 0 });
  }

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM orders
    WHERE date(created_at, 'localtime') = ?
    GROUP BY status
  `).all(today).reduce((result, row) => {
    result[row.status] = row.count;
    return result;
  }, {});

  return {
    date: today,
    revenue_today: revenueToday,
    orders_today: ordersToday,
    customers,
    products,
    recent_orders: recentOrders,
    best_products: bestProducts,
    revenue_7_days: revenue7Days,
    status_counts_today: statusCounts
  };
}

module.exports = { get };
