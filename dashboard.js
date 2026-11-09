document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "dashboard") return;
  if (!requireAuth()) return;
  const revenue = document.getElementById("dash-revenue");
  if (!revenue) return;
  try {
    const data = (await api.get("/dashboard")).data;
    revenue.textContent = formatVND(data.revenue_today);
    const stats = document.querySelectorAll(".stat-card strong");
    if (stats[1]) stats[1].textContent = data.orders_today;
    if (stats[2]) stats[2].textContent = data.customers.toLocaleString("vi-VN");
    if (stats[3]) stats[3].textContent = data.products;
    const best = document.querySelector(".best-list");
    if (best)
      best.innerHTML = data.best_products
        .slice(0, 4)
        .map(
          (p, i) =>
            `<div class="best-item"><div><strong>${escapeHtml(p.product_name)}</strong><small>${p.sold} sản phẩm đã bán</small></div><b>${i + 1}</b></div>`,
        )
        .join("");
    const tbody = document.querySelector(".order-table tbody");
    if (tbody)
      tbody.innerHTML = data.recent_orders
        .slice(0, 5)
        .map(
          (o) =>
            `<tr><td>${escapeHtml(o.code)}</td><td>${escapeHtml(o.customer_name)}</td><td>${formatVND(o.total_amount)}</td><td><span class="status ${o.status === "SHIPPING" ? "status--ship" : o.status === "COMPLETED" ? "status--done" : "status--wait"}">${statusLabel(o.status)}</span></td></tr>`,
        )
        .join("");
  } catch (e) {
    showToast(e.message);
  }
});
function statusLabel(s) {
  return (
    {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
      PROCESSING: "Đang chuẩn bị",
      SHIPPING: "Đang giao",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    }[s] || s
  );
}
