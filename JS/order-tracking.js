/* Theo dõi đơn hàng — đọc đơn từ localStorage "bakery_orders" (do checkout.js lưu).
   Khi có API, chỉ cần thay loadOrders() bằng dữ liệu từ backend. */
const STEPS = ["Chờ xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn thành"];
const PICKUP_READY = "Sẵn sàng nhận bánh";
const PAY_NAME = { cod: "Tiền mặt khi nhận bánh", bank: "Chuyển khoản", wallet: "Ví điện tử" };
const STATUS_CLASS = {
  "Chờ xác nhận": "status--wait", "Đang chuẩn bị": "status--wait",
  "Đang giao": "status--ship", [PICKUP_READY]: "status--ship",
  "Hoàn thành": "status--done", "Đã hủy": "status--cancel"
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
const pad = n => String(n).padStart(2, "0");

function loadOrders() {
  try { return JSON.parse(localStorage.getItem("bakery_orders") || "[]"); }
  catch { return []; }
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function stepLabels(o) {
  const l = STEPS.slice();
  if (o.method === "pickup") l[2] = PICKUP_READY;
  return l;
}

function stepIndex(o) {
  const labels = stepLabels(o);
  let i = labels.indexOf(o.status);
  if (i < 0 && o.status === "Đang giao") i = 2;
  return i;
}

function timeline(o) {
  const labels = stepLabels(o), idx = stepIndex(o);
  const items = labels.map((label, i) => {
    const done = idx >= 0 && (i < idx || idx === labels.length - 1);
    const current = !done && i === idx;
    const when = i === 0 ? fmtTime(o.createdAt)
      : o.history && o.history[label] ? fmtTime(o.history[label])
      : done || current ? "" : "Chưa đến";
    return `<li class="timeline-step ${done ? "done" : ""} ${current ? "current" : ""}" ${current ? 'aria-current="step"' : ""}>
      <div class="timeline-dot" aria-hidden="true">${done ? "✓" : current ? "●" : i + 1}</div>
      <div class="timeline-text"><span>${label}</span><small>${when}</small></div>
    </li>`;
  }).join("");
  return `<ol class="timeline" aria-label="Tiến trình đơn hàng">${items}</ol>`;
}

function renderOrder(o) {
  const rows = o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${formatVND(i.price * i.qty)}</td></tr>`).join("");
  const extra = `
    ${o.discount ? `<tr class="sub"><td colspan="2">Giảm giá</td><td>−${formatVND(o.discount)}</td></tr>` : ""}
    <tr class="sub"><td colspan="2">Phí giao hàng</td><td>${o.shipping ? formatVND(o.shipping) : "Miễn phí"}</td></tr>`;
  const cancelled = o.status === "Đã hủy";
  const where = o.method === "pickup" ? "Nhận tại cửa hàng" : "Địa chỉ giao hàng";
  const date = o.date ? o.date.split("-").reverse().join("/") : "";

  return `
    <div class="tracking-head">
      <div>
        <h2>Đơn hàng <span>${esc(o.id)}</span></h2>
        <span class="status ${STATUS_CLASS[o.status] || "status--wait"}">${esc(o.status)}</span>
      </div>
      <strong>${formatVND(o.total)}</strong>
    </div>
    <section class="panel tracking-card">
      ${cancelled ? '<p class="cancel-note">Đơn hàng này đã được hủy.</p>' : timeline(o)}
      <div class="order-info">
        <div>
          <h3>Sản phẩm trong đơn</h3>
          <div class="table-wrap">
            <table class="order-table">
              <thead><tr><th>Sản phẩm</th><th>SL</th><th>Giá</th></tr></thead>
              <tbody>${rows}${extra}
                <tr class="total"><td colspan="2">Tổng cộng</td><td>${formatVND(o.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="delivery-box">
          <strong>${where}</strong>
          ${esc(o.customer.name)} · ${esc(o.customer.phone)}<br>${esc(o.address)}
          <strong>Thời gian nhận</strong>
          ${o.time ? esc(o.time) : ""} ngày ${esc(date)}
          <strong>Thanh toán</strong>
          ${PAY_NAME[o.pay] || ""}
          ${o.note ? `<strong>Ghi chú</strong>${esc(o.note)}` : ""}
        </div>
      </div>
    </section>`;
}

function renderChips(orders, currentId) {
  if (orders.length < 2) return "";
  return `<div class="order-chips" role="group" aria-label="Đơn hàng đã đặt">` +
    orders.slice(0, 6).map(o =>
      `<button type="button" class="chip" data-id="${esc(o.id)}" aria-pressed="${o.id === currentId}">${esc(o.id)} · ${esc(o.status)}</button>`
    ).join("") + `</div>`;
}

function show(orders, o) {
  document.getElementById("tracking-root").innerHTML = renderChips(orders, o.id) + renderOrder(o);
}

function showEmpty() {
  document.getElementById("tracking-root").innerHTML = `
    <div class="panel empty-state">
      <h3>Chưa có đơn hàng nào</h3>
      <p>Khi bạn đặt bánh, đơn hàng sẽ xuất hiện ở đây.</p>
      <a class="btn btn--primary" href="products.html">Xem sản phẩm</a>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const orders = loadOrders();
  const err = document.getElementById("track-err");
  const wanted = new URLSearchParams(location.search).get("code");
  let current = orders.find(o => wanted && norm(o.id) === norm(wanted)) || orders[0];

  if (!current) showEmpty(); else show(orders, current);
  if (wanted && !orders.find(o => norm(o.id) === norm(wanted))) {
    err.textContent = `Không tìm thấy đơn hàng ${wanted}. Hãy kiểm tra lại mã đơn.`;
  }

  document.getElementById("track-form").addEventListener("submit", e => {
    e.preventDefault();
    const code = document.getElementById("track-code").value.trim();
    if (!code) { err.textContent = "Nhập mã đơn hàng để tra cứu."; return; }
    const found = orders.find(o => norm(o.id) === norm(code));
    if (!found) { err.textContent = "Không tìm thấy đơn hàng với mã này. Hãy kiểm tra lại mã đơn."; return; }
    err.textContent = "";
    current = found;
    show(orders, found);
  });

  document.getElementById("tracking-root").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const found = orders.find(o => o.id === chip.dataset.id);
    if (found) { current = found; err.textContent = ""; show(orders, found); }
  });
});