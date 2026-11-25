function displayOrderTime(value) {
  const utc = /Z$|[+-]\d\d:\d\d$/.test(value)
    ? value
    : value.replace(" ", "T") + "Z";
  return new Date(utc).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
const STATUS_LABEL = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
function statusClass(s) {
  return s === "SHIPPING"
    ? "status--ship"
    : s === "COMPLETED"
      ? "status--done"
      : "status--wait";
}
async function cancelOrder(id) {
  const reason = prompt("LÝ DO HỦY ĐƠN (ít nhất 10 ký tự, bắt buộc):\nVí dụ: Khách gọi điện yêu cầu hủy đơn do đặt nhầm.");
  if (reason === null) return;
  if (reason.trim().length < 10 || reason.trim().length > 500) { showToast("Lý do hủy cần từ 10 đến 500 ký tự."); return; }
  if (!confirm("Xác nhận hủy đơn? Hệ thống sẽ ghi lại lý do và hoàn số bánh vào đúng lô.")) return;
  try { await api.put(`/orders/${id}/status`, { status: "CANCELLED", cancellation_reason: reason.trim() }); showToast("Đã hủy đơn và lưu lý do."); await renderStaffOrders(); }
  catch(e) { showToast(e.message); }
}
async function updateOrder(btn, id, currentStatus) {
  const next = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPING",
    SHIPPING: "COMPLETED",
  }[currentStatus];
  if (!next) return;
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";
  try {
    await api.put("/orders/" + id + "/status", { status: next });
    showToast("✓ Đã cập nhật đơn hàng");
    await renderStaffOrders();
  } catch (e) {
    showToast(e.message);
    btn.disabled = false;
    btn.textContent = "Thử lại";
  }
}
async function renderOwnerDashboard() {
  if (!requireRole("ADMIN")) return;
  try {
    const data = (await api.get("/dashboard")).data;
    const stats = document.querySelectorAll(".admin-stat strong");
    if (stats[0]) stats[0].textContent = formatVND(data.revenue_today);
    if (stats[1]) stats[1].textContent = data.orders_today;
    if (stats[2]) stats[2].textContent = data.customers.toLocaleString("vi-VN");
    const avg = data.completed_today
      ? Math.round(data.revenue_today / data.completed_today)
      : 0;
    if (stats[3]) stats[3].textContent = formatVND(avg);
    const rank = document.querySelector(".rank-list");
    if (rank)
      rank.innerHTML = data.best_products
        .slice(0, 3)
        .map(
          (p, i) =>
            `<div><span class="rank">0${i + 1}</span><p><b>${escapeHtml(p.product_name)}</b><small>${p.sold} sản phẩm đã bán</small></p><strong>${Math.round(p.price / 1000)}k</strong></div>`,
        )
        .join("");
    if (rank && !data.best_products.length)
      rank.textContent = "Chưa có sản phẩm bán trong 7 ngày.";
    renderRevenueChart(data.revenue_7_days || []);
    const tbody = document.querySelector("#orders tbody");
    if (tbody)
      tbody.innerHTML = data.recent_orders
        .slice(0, 6)
        .map(
          (o) =>
            `<tr><td><b>${escapeHtml(o.code)}</b></td><td>${escapeHtml(o.customer_name)}</td><td>${displayOrderTime(o.created_at)}</td><td><b>${formatVND(o.total_amount)}</b></td><td><span class="status ${statusClass(o.status)}">${STATUS_LABEL[o.status]}</span></td><td><button class="mini-btn" data-order-id="${o.id}">Chi tiết</button></td></tr>`,
        )
        .join("");
  } catch (e) {
    showToast(e.message);
  }
}
async function renderStaffOrders() {
  if (!requireRole("STAFF", "ADMIN")) return;
  const tbody = document.querySelector(".staff-dashboard #orders tbody");
  if (!tbody) return;
  try {
    const data = (await api.get("/orders")).data;
    tbody.innerHTML = data
      .map(
        (o) =>
          `<tr><td><b>${escapeHtml(o.code)}</b><small class="cell-sub">${displayOrderTime(o.created_at)}</small></td><td>${escapeHtml(o.customer_name)}</td><td>${o.item_count || "-"} sản phẩm</td><td><b>${formatVND(o.total_amount)}</b></td><td><span class="status ${statusClass(o.status)}">${STATUS_LABEL[o.status]}</span>${o.cancellation_reason ? `<small class="cell-sub">Lý do: ${escapeHtml(o.cancellation_reason)}</small>` : ""}</td><td>${["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING"].includes(o.status) ? `<button class="action-btn" data-order-id="${o.id}" onclick="updateOrder(this,${o.id},'${o.status}')">${o.status === "PENDING" ? "Xác nhận" : o.status === "CONFIRMED" ? "Bắt đầu chuẩn bị" : o.status === "PROCESSING" ? "Bắt đầu giao" : "Hoàn tất"}</button>${o.status !== 'SHIPPING' ? `<button class="mini-btn cancel-btn" onclick="cancelOrder(${o.id})">Hủy đơn</button>` : ''}<button class="mini-btn" data-order-id="${o.id}">Chi tiết</button>` : `<button class="mini-btn" data-order-id="${o.id}">Chi tiết</button>`}</td></tr>`,
      )
      .join("");
    if (!data.length)
      tbody.innerHTML = '<tr><td colspan="6">Chưa có đơn hàng.</td></tr>';
    window.applyStaffFilter?.();
    const stats = document.querySelectorAll(".staff-stats .admin-stat strong");
    if (stats.length) {
      stats[0].textContent = data.filter((x) => x.status === "PENDING").length;
      stats[1].textContent = data.filter(
        (x) => x.status === "PROCESSING",
      ).length;
      stats[2].textContent = data.filter(
        (x) => x.status === "COMPLETED",
      ).length;
    }
  } catch (e) {
    showToast(e.message);
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  document.querySelectorAll(".admin-avatar,.top-avatar").forEach(e=>e.textContent=(currentUser()?.full_name||"Tài khoản").split(/\s+/).slice(-2).map(x=>x[0]).join(""));
  const userName=document.querySelector(".admin-user b");if(userName)userName.textContent=currentUser()?.full_name||"Tài khoản";
  if (document.body.classList.contains("staff-dashboard"))
    await renderStaffOrders();
  if (document.body.classList.contains("staff-dashboard")) {
    const alerts = document.getElementById("staff-expiry-alerts");
    if (alerts) try {
      const rows = (await api.get("/stock/alerts")).data;
      alerts.innerHTML = rows.length ? rows.map(x => `<div class="expiry-alert"><span class="expiry-indicator ${x.level==='EXPIRED'?'danger':''}">!</span><div><b>${escapeHtml(x.product_name)}</b><small>${x.quantity} bánh · ${x.level==='UNKNOWN'?'Chưa xác nhận hạn sử dụng':x.level==='EXPIRED'?'Đã quá hạn':'Sắp hết hạn'}${x.expiry_date?' · HSD '+escapeHtml(x.expiry_date):''}</small></div></div>`).join("") : '<div class="expiry-empty">✓ Không có lô bánh cần cảnh báo.</div>';
    } catch(e) { alerts.textContent=e.message; }
  }
  if (
    document.body.classList.contains("admin-body") &&
    !document.body.classList.contains("staff-dashboard")
  )
    await renderOwnerDashboard();
});
window.updateOrder = updateOrder;
window.cancelOrder = cancelOrder;
window.renderStaffOrders = renderStaffOrders;

function renderRevenueChart(rows) {
  const chart = document.querySelector(".revenue-chart");
  if (!chart) return;
  const today = new Date(Date.now() + 7 * 3600000),
    series = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      day: key,
      total: rows.find((x) => x.day === key)?.total || 0,
    });
  }
  const max = Math.max(1, ...series.map((x) => x.total));
  chart.innerHTML = '<div class="bars"></div>';
  const bars = chart.querySelector(".bars");
  for (const item of series) {
    const bar = document.createElement("div"),
      label = document.createElement("i"),
      day = document.createElement("em");
    bar.style.setProperty("--h", Math.max(2, (item.total / max) * 90) + "%");
    label.textContent = formatVND(item.total);
    day.textContent = item.day.slice(8) + "/" + item.day.slice(5, 7);
    bar.title = item.day + ": " + formatVND(item.total);
    bar.append(label, day);
    bars.append(bar);
  }
}
