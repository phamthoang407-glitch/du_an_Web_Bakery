const STATUS_LABEL = {
  PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị", SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy"
};

function dashboardProEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function statusClass(status) {
  if (status === "SHIPPING") return "status--ship";
  if (status === "COMPLETED") return "status--done";
  return "status--wait";
}

function money(value) {
  return formatVND(Number(value) || 0);
}

function renderOwnerRevenueChart(rows) {
  const bars = document.querySelector(".admin-body:not(.staff-dashboard) .revenue-chart .bars");
  if (!bars) return;
  const data = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, ...data.map(row => Number(row.total) || 0));
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  bars.innerHTML = data.map((row, index) => {
    const amount = Number(row.total) || 0;
    const weekday = weekdays[new Date(`${row.day}T12:00:00`).getDay()];
    const height = amount > 0 ? Math.max(4, Math.round(amount / max * 100)) : 2;
    return `<div class="${index === data.length - 1 ? "today" : ""}" style="--h:${height}%" title="${dashboardProEscape(row.day)}: ${money(amount)}"><i>${money(amount)}</i><em>${weekday}</em></div>`;
  }).join("") || '<p class="dashboard-empty">Chưa có dữ liệu doanh thu.</p>';
}

async function updateOrder(button, id, currentStatus) {
  const nextStatus = {
    PENDING: "CONFIRMED", CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPING", SHIPPING: "COMPLETED"
  }[currentStatus];
  if (!nextStatus || !id) return;

  button.disabled = true;
  const oldText = button.textContent;
  button.textContent = "Đang xử lý...";
  try {
    await api.put(`/orders/${encodeURIComponent(id)}/status`, { status: nextStatus });
    showToast("Đã cập nhật trạng thái đơn hàng.");
    await renderStaffOrders();
  } catch (error) {
    showToast(error.message || "Không thể cập nhật đơn hàng.");
    button.disabled = false;
    button.textContent = oldText;
  }
}

async function renderOwnerDashboard() {
  if (!requireRole("ADMIN")) return;
  try {
    const response = await api.get("/dashboard");
    const data = response.data || {};
    const stats = document.querySelectorAll(".admin-stat strong");
    if (stats[0]) stats[0].textContent = money(data.revenue_today);
    if (stats[1]) stats[1].textContent = Number(data.orders_today) || 0;
    if (stats[2]) stats[2].textContent = (Number(data.customers) || 0).toLocaleString("vi-VN");
    const average = Number(data.orders_today) ? Number(data.revenue_today) / Number(data.orders_today) : 0;
    if (stats[3]) stats[3].textContent = money(average);

    const rankList = document.querySelector(".rank-list");
    if (rankList) {
      const products = Array.isArray(data.best_products) ? data.best_products.slice(0, 3) : [];
      rankList.innerHTML = products.length ? products.map((product, index) => `
        <div><span class="rank">0${index + 1}</span><p><b>${dashboardProEscape(product.product_name)}</b>
        <small>${Number(product.sold) || 0} sản phẩm đã bán</small></p><strong>${money(product.price)}</strong></div>`).join("")
        : '<p class="dashboard-empty">Chưa có sản phẩm bán chạy.</p>';
    }

    const tbody = document.querySelector("#orders tbody");
    if (tbody) {
      const orders = Array.isArray(data.recent_orders) ? data.recent_orders.slice(0, 6) : [];
      tbody.innerHTML = orders.length ? orders.map(order => `
        <tr><td><b>${dashboardProEscape(order.code)}</b></td><td>${dashboardProEscape(order.customer_name)}</td>
        <td>${new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</td>
        <td><b>${money(order.total_amount)}</b></td><td><span class="status ${statusClass(order.status)}">${STATUS_LABEL[order.status] || dashboardProEscape(order.status)}</span></td>
        <td><a class="mini-btn" href="dashboard-staff.html">Chi tiết</a></td></tr>`).join("")
        : '<tr><td colspan="6">Chưa có đơn hàng.</td></tr>';
    }

    renderOwnerRevenueChart(data.revenue_7_days);
  } catch (error) {
    showToast(error.message || "Không thể tải dashboard chủ quầy.");
  }
}

async function renderStaffOrders() {
  if (!requireRole("STAFF")) return;
  const tbody = document.querySelector(".staff-dashboard #orders tbody");
  if (!tbody) return;

  try {
    const response = await api.get("/orders");
    const orders = Array.isArray(response.data) ? response.data : [];
    tbody.innerHTML = orders.length ? orders.map(order => `
      <tr><td><b>${dashboardProEscape(order.code)}</b><small class="cell-sub">${new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small></td>
      <td>${dashboardProEscape(order.customer_name)}</td><td>${Number(order.item_count) || 0} sản phẩm</td>
      <td><b>${money(order.total_amount)}</b></td><td><span class="status ${statusClass(order.status)}">${STATUS_LABEL[order.status] || dashboardProEscape(order.status)}</span></td>
      <td>${["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING"].includes(order.status)
        ? `<button class="action-btn" onclick="updateOrder(this, ${Number(order.id)}, '${order.status}')">${({ PENDING: "Xác nhận", CONFIRMED: "Bắt đầu chuẩn bị", PROCESSING: "Bắt đầu giao", SHIPPING: "Hoàn tất" })[order.status]}</button>`
        : '<span>—</span>'}</td></tr>`).join("")
      : '<tr><td colspan="6">Chưa có đơn hàng cần xử lý.</td></tr>';

    const stats = document.querySelectorAll(".staff-stats .admin-stat strong");
    if (stats[0]) stats[0].textContent = orders.filter(order => order.status === "PENDING").length;
    if (stats[1]) stats[1].textContent = orders.filter(order => order.status === "PROCESSING").length;
    if (stats[2]) stats[2].textContent = orders.filter(order => order.status === "COMPLETED").length;

    const intro = document.querySelector(".staff-dashboard .admin-top p");
    if (intro) intro.innerHTML = `Hiện có <b>${orders.filter(order => order.status === "PENDING").length} đơn</b> chờ xác nhận.`;
  } catch (error) {
    showToast(error.message || "Không thể tải danh sách đơn hàng.");
    tbody.innerHTML = '<tr><td colspan="6">Không tải được đơn hàng. Vui lòng thử tải lại trang.</td></tr>';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  if (document.body.classList.contains("staff-dashboard")) {
    await renderStaffOrders();
  } else if (document.body.classList.contains("admin-body")) {
    await renderOwnerDashboard();
  }
});

window.updateOrder = updateOrder;
window.renderStaffOrders = renderStaffOrders;
