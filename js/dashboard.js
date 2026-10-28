function dashboardEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function dashboardStatusLabel(status) {
  return ({
    PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang chuẩn bị", SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy"
  })[status] || status || "Không rõ";
}

function dashboardStatusClass(status) {
  if (status === "SHIPPING") return "status--ship";
  if (status === "COMPLETED") return "status--done";
  return "status--wait";
}

function renderDashboardRevenueChart(rows) {
  const chart = document.querySelector(".dashboard-main .chart");
  if (!chart) return;
  const values = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, ...values.map(row => Number(row.total) || 0));
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  chart.innerHTML = values.map(row => {
    const amount = Number(row.total) || 0;
    const day = new Date(`${row.day}T12:00:00`).getDay();
    const height = amount > 0 ? Math.max(4, Math.round(amount / max * 100)) : 2;
    return `<div class="bar" style="height:${height}%" title="${dashboardEscape(row.day)}: ${formatVND(amount)}"><span>${weekdays[day]}</span></div>`;
  }).join("") || '<p class="dashboard-empty">Chưa có dữ liệu doanh thu.</p>';
}

document.addEventListener("DOMContentLoaded", async () => {
  if (document.body.dataset.page !== "dashboard") return;
  if (!requireAuth()) return;
  const revenue = document.getElementById("dash-revenue");
  if (!revenue) return;

  try {
    const response = await api.get("/dashboard");
    const data = response.data || {};
    revenue.textContent = formatVND(Number(data.revenue_today) || 0);

    const stats = document.querySelectorAll(".stat-card strong");
    if (stats[1]) stats[1].textContent = Number(data.orders_today) || 0;
    if (stats[2]) stats[2].textContent = (Number(data.customers) || 0).toLocaleString("vi-VN");
    if (stats[3]) stats[3].textContent = Number(data.products) || 0;

    const best = document.querySelector(".best-list");
    if (best) {
      const products = Array.isArray(data.best_products) ? data.best_products.slice(0, 4) : [];
      best.innerHTML = products.length ? products.map((product, index) => `
        <div class="best-item"><div><strong>${dashboardEscape(product.product_name)}</strong>
        <small>${Number(product.sold) || 0} sản phẩm đã bán</small></div><b>${index + 1}</b></div>`).join("")
        : '<p class="dashboard-empty">Chưa có dữ liệu sản phẩm bán chạy.</p>';
    }

    const tbody = document.querySelector(".order-table tbody");
    if (tbody) {
      const orders = Array.isArray(data.recent_orders) ? data.recent_orders.slice(0, 5) : [];
      tbody.innerHTML = orders.length ? orders.map(order => `
        <tr><td>${dashboardEscape(order.code)}</td><td>${dashboardEscape(order.customer_name)}</td>
        <td>${formatVND(Number(order.total_amount) || 0)}</td>
        <td><span class="status ${dashboardStatusClass(order.status)}">${dashboardStatusLabel(order.status)}</span></td></tr>`).join("")
        : '<tr><td colspan="4">Chưa có đơn hàng.</td></tr>';
    }

    renderDashboardRevenueChart(data.revenue_7_days);
  } catch (error) {
    showToast(error.message || "Không thể tải dữ liệu dashboard.");
  }
});
