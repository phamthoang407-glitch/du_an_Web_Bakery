/* Tài khoản — lưu hồ sơ trong localStorage "bakery_profile" (checkout.js dùng để điền sẵn).
   Chưa có hồ sơ thì lấy tạm thông tin từ đơn hàng gần nhất. */
const PROFILE_KEY = "bakery_profile";
const ST_CLASS = {
  "Chờ xác nhận": "status--wait", "Đang chuẩn bị": "status--wait",
  "Đang giao": "status--ship", "Sẵn sàng nhận bánh": "status--ship",
  "Hoàn thành": "status--done", "Đã hủy": "status--cancel"
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };

function initials(name) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "KH";
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
}

function currentProfile() {
  const saved = read(PROFILE_KEY, null);
  if (saved) return saved;
  const last = read("bakery_orders", [])[0];
  if (!last) return { name: "", phone: "", email: "", address: "" };
  return {
    name: last.customer?.name || "", phone: last.customer?.phone || "", email: last.customer?.email || "",
    address: last.method === "delivery" ? last.address || "" : ""
  };
}

function paintHead(name) {
  $("#profile-name").textContent = name || "Khách hàng";
  $("#avatar").textContent = initials(name || "");
  const role = localStorage.getItem("bakery_role");
  $("#profile-role").textContent = role === "owner" ? "Chủ quầy" : role === "staff" ? "Nhân viên" : "Khách hàng";
}

function mark(id, ok) {
  document.getElementById(id).closest(".field").classList.toggle("bad", !ok);
  return ok;
}

function recentOrders() {
  const list = read("bakery_orders", []).slice(0, 3);
  $("#recent-orders").innerHTML = list.length
    ? list.map(o => `
      <a class="order-row" href="order-tracking.html?code=${encodeURIComponent(o.id)}">
        <div><b>${esc(o.id)}</b><small>${o.items.length} loại bánh · ${new Date(o.createdAt).toLocaleDateString("vi-VN")}</small></div>
        <span class="status ${ST_CLASS[o.status] || "status--wait"}">${esc(o.status)}</span>
        <strong>${formatVND(o.total)}</strong>
      </a>`).join("") + '<a class="text-link all-orders" href="order-tracking.html">Xem tất cả đơn hàng →</a>'
    : '<p class="muted-empty">Bạn chưa có đơn hàng nào. <a class="text-link" href="products.html">Chọn bánh ngay →</a></p>';
}

document.addEventListener("DOMContentLoaded", () => {
  const p = currentProfile();
  $("#p-name").value = p.name; $("#p-phone").value = p.phone;
  $("#p-email").value = p.email; $("#p-address").value = p.address;
  paintHead(p.name);
  recentOrders();

  document.querySelectorAll("#profile-form input").forEach(el =>
    el.addEventListener("input", () => el.closest(".field").classList.remove("bad")));

  $("#profile-form").addEventListener("submit", e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const ok = [
      mark("p-name", v("p-name").length >= 2),
      mark("p-phone", /^(0|\+84)\d{9,10}$/.test(v("p-phone").replace(/[\s.\-]/g, ""))),
      mark("p-email", !v("p-email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("p-email"))),
      mark("p-address", !v("p-address") || v("p-address").length >= 6)
    ];
    if (ok.includes(false)) {
      document.querySelector(".field.bad input")?.focus();
      showToast("Vui lòng kiểm tra lại thông tin");
      return;
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: v("p-name"), phone: v("p-phone"), email: v("p-email"), address: v("p-address") }));
    paintHead(v("p-name"));
    showToast("✓ Đã lưu thông tin");
  });

  $("#logout").addEventListener("click", () => localStorage.removeItem("bakery_role"));

  // đánh dấu mục menu đang xem khi bấm
  document.querySelectorAll(".account-menu a[href^='#']").forEach(a =>
    a.addEventListener("click", () => {
      document.querySelectorAll(".account-menu a").forEach(x => x.classList.toggle("active", x === a));
    }));
});