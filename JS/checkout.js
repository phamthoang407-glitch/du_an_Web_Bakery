/* Đặt hàng — dùng getCart/saveCart/showToast từ main.js, PRODUCTS/STORES/formatVND từ data.js */
const SHIP_FEE = 30000;        // phí giao mẫu
const FREE_SHIP_FROM = 500000; // miễn phí giao từ mức này (sau giảm giá)
const CO_PROMOS = { BAKERY10: 10 };
const PAY_LABEL = { cod: "tiền mặt khi nhận bánh", bank: "chuyển khoản", wallet: "ví điện tử" };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const val = id => document.getElementById(id).value.trim();
const method = () => document.querySelector('input[name="method"]:checked').value;

function coLines() {
  return getCart()
    .map(c => {
      const p = PRODUCTS.find(x => x.id === Number(c.id));
      return p ? { p, qty: c.qty } : null;
    })
    .filter(Boolean);
}

function coTotals() {
  const L = coLines();
  const sub = L.reduce((s, l) => s + l.p.price * l.qty, 0);
  const code = localStorage.getItem("bakery_promo");
  const pct = CO_PROMOS[code] || 0;
  const disc = Math.round(sub * pct / 100);
  const ship = method() === "delivery" && L.length && sub - disc < FREE_SHIP_FROM ? SHIP_FEE : 0;
  return { sub, pct, disc, ship, total: sub - disc + ship };
}

function renderSummary() {
  const L = coLines(), t = coTotals();
  $("#co-lines").innerHTML = L.map(({ p, qty }) => `
    <div class="checkout-line">
      <img src="${p.image}" alt="" loading="lazy">
      <div><b>${p.name}</b><small>Số lượng: ${qty}</small></div>
      <strong>${formatVND(p.price * qty)}</strong>
    </div>`).join("");
  $("#co-sub").textContent = formatVND(t.sub);
  $("#co-disc-row").hidden = !t.disc;
  $("#co-disc-label").textContent = `Giảm giá (${t.pct}%)`;
  $("#co-disc").textContent = "−" + formatVND(t.disc);
  $("#co-ship").textContent = method() === "pickup" ? "Miễn phí" : t.ship ? formatVND(t.ship) : "Miễn phí";
  $("#co-total").textContent = formatVND(t.total);
  $("#co-bar-total").textContent = formatVND(t.total);
  $("#ship-hint").textContent = `Phí ${formatVND(SHIP_FEE)}, miễn phí từ ${formatVND(FREE_SHIP_FROM)}`;
}

function prefill() {
  try {
    const p = JSON.parse(localStorage.getItem("bakery_profile") || "null");
    if (!p) return;
    [["f-name", p.name], ["f-phone", p.phone], ["f-email", p.email], ["f-address", p.address]].forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (v && el && !el.value) el.value = v;
    });
  } catch (e) { /* bỏ qua hồ sơ lỗi */ }
}

function setupForm() {
  // cửa hàng
  $("#f-store").innerHTML = '<option value="">Chọn cửa hàng</option>' +
    STORES.map(s => `<option value="${s.id}">${s.name} — ${s.address}</option>`).join("");

  // ngày giờ
  const d = new Date(), p = n => String(n).padStart(2, "0");
  $("#f-date").min = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      const t = `${p(h)}:${p(m)}`;
      $("#f-time").add(new Option(t, t));
    }
  }

  // đổi phương thức nhận / thanh toán
  document.querySelectorAll(".payment-option input").forEach(r =>
    r.addEventListener("change", () => {
      document.querySelectorAll(`input[name="${r.name}"]`).forEach(x =>
        x.closest(".payment-option").classList.toggle("active", x.checked));
      if (r.name === "method") {
        const pick = method() === "pickup";
        $("#wrap-address").hidden = pick;
        $("#wrap-store").hidden = !pick;
        renderSummary();
      }
    }));

  // gỡ lỗi khi người dùng sửa
  document.querySelectorAll("#checkout-form input, #checkout-form select")
    .forEach(el => el.addEventListener("input", () => el.closest(".field")?.classList.remove("bad")));

  prefill();
  $("#checkout-form").addEventListener("submit", onSubmit);
}

function mark(id, ok, msg) {
  const f = document.getElementById(id).closest(".field");
  f.classList.toggle("bad", !ok);
  if (msg) f.querySelector(".err").textContent = msg;
  return ok;
}

function validate() {
  const phone = val("f-phone").replace(/[\s.\-]/g, "");
  const today = $("#f-date").min, date = $("#f-date").value, time = $("#f-time").value;
  let dateMsg = "Chọn ngày nhận từ hôm nay trở đi.", timeMsg = "Chọn giờ nhận bánh.";
  let dateOk = !!date && date >= today, timeOk = !!time;
  if (dateOk && timeOk && date === today) {
    const now = new Date(), [h, m] = time.split(":").map(Number);
    if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) { timeOk = false; timeMsg = "Giờ nhận đã qua, hãy chọn giờ muộn hơn."; }
  }
  const results = [
    mark("f-name", val("f-name").length >= 2),
    mark("f-phone", /^(0|\+84)\d{9,10}$/.test(phone)),
    mark("f-email", !val("f-email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("f-email"))),
    mark("f-address", method() === "pickup" || val("f-address").length >= 6),
    mark("f-store", method() === "delivery" || !!val("f-store")),
    mark("f-date", dateOk, dateMsg),
    mark("f-time", timeOk, timeMsg)
  ];
  return !results.includes(false);
}

function onSubmit(e) {
  e.preventDefault();
  if (!coLines().length) return;
  if (!validate()) {
    const first = document.querySelector(".field.bad input, .field.bad select");
    first?.focus();
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    showToast("Vui lòng kiểm tra lại thông tin");
    return;
  }

  const t = coTotals();
  const pay = document.querySelector('input[name="pay"]:checked').value;
  const store = STORES.find(s => String(s.id) === val("f-store"));
  const order = {
    id: "BK" + Date.now().toString().slice(-6),
    createdAt: new Date().toISOString(),
    status: "Chờ xác nhận",
    customer: { name: val("f-name"), phone: val("f-phone"), email: val("f-email") },
    method: method(),
    address: method() === "delivery" ? val("f-address") : store ? `${store.name} — ${store.address}` : "",
    date: val("f-date"), time: val("f-time"), pay, note: val("f-note"),
    items: coLines().map(({ p, qty }) => ({ id: p.id, name: p.name, price: p.price, qty })),
    subtotal: t.sub, discount: t.disc, shipping: t.ship, total: t.total
  };

  try {
    const orders = JSON.parse(localStorage.getItem("bakery_orders") || "[]");
    orders.unshift(order);
    localStorage.setItem("bakery_orders", JSON.stringify(orders));
  } catch (err) { console.warn("Không lưu được đơn hàng", err); }

  saveCart([]);
  localStorage.removeItem("bakery_promo");
  showDone(order);
}

function showDone(o) {
  $("#co-bar").remove();
  $("#checkout-root").innerHTML = `
    <section class="panel order-done" role="status">
      <div class="order-done__icon" aria-hidden="true">🎂</div>
      <h2>Đặt hàng thành công</h2>
      <p>Mã đơn <b>${esc(o.id)}</b>. Quầy sẽ gọi xác nhận qua số <b>${esc(o.customer.phone)}</b>.</p>
      <p class="order-done__meta">Nhận bánh lúc ${o.time} ngày ${o.date.split("-").reverse().join("/")} · Thanh toán ${PAY_LABEL[o.pay]} · Tổng ${formatVND(o.total)}</p>
      <div class="order-done__actions">
        <a class="btn btn--primary" href="order-tracking.html?code=${encodeURIComponent(o.id)}">Theo dõi đơn hàng</a>
        <a class="btn btn--ghost" href="products.html">Tiếp tục mua bánh</a>
      </div>
    </section>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!coLines().length) {
    $("#co-bar").remove();
    $("#checkout-root").innerHTML = `
      <div class="panel empty-state order-empty">
        <h3>Chưa có bánh nào để đặt</h3>
        <p>Thêm bánh vào giỏ trước khi đặt hàng nhé.</p>
        <a class="btn btn--primary" href="products.html">Xem sản phẩm</a>
      </div>`;
    return;
  }
  setupForm();
  renderSummary();
});