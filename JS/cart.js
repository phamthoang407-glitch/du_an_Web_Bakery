/* Giỏ hàng — dùng getCart/saveCart/showToast từ main.js, PRODUCTS/formatVND từ data.js */
const CART_PROMOS = { BAKERY10: 10 }; // mã mẫu: giảm 10%
let promoMsg = { text: "", ok: true };

function cartLines() {
  return getCart()
    .map(c => {
      const p = PRODUCTS.find(x => x.id === Number(c.id));
      return p ? { p, qty: c.qty } : null;
    })
    .filter(Boolean);
}

function cartTotals() {
  const L = cartLines();
  const sub = L.reduce((s, l) => s + l.p.price * l.qty, 0);
  const pct = CART_PROMOS[localStorage.getItem("bakery_promo")] || 0;
  const disc = Math.round(sub * pct / 100);
  return { sub, pct, disc, total: sub - disc, count: L.reduce((s, l) => s + l.qty, 0) };
}

function renderCart(focusSel) {
  const root = document.getElementById("cart-root");
  const L = cartLines();
  const t = cartTotals();
  document.getElementById("cart-sub").textContent = L.length
    ? `${t.count} sản phẩm trong giỏ`
    : "Chưa có sản phẩm nào trong giỏ";

  if (!L.length) {
    root.innerHTML = `
      <div class="panel empty-state cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">🛒</div>
        <h3>Giỏ hàng đang trống</h3>
        <p>Chọn vài chiếc bánh ngon để bắt đầu nhé.</p>
        <a class="btn btn--primary" href="products.html">Xem sản phẩm</a>
      </div>`;
    return;
  }

  const items = L.map(({ p, qty }) => `
    <article class="cart-item" data-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div class="cart-item__info">
        <h3>${p.name}</h3>
        <p>${p.category} · ${formatVND(p.price)}${p.status === "Sắp hết" ? ' · <b class="low">Sắp hết</b>' : ""}</p>
        <button type="button" class="remove" data-act="remove" aria-label="Xóa ${p.name} khỏi giỏ">Xóa</button>
      </div>
      <div class="qty" role="group" aria-label="Số lượng ${p.name}">
        <button type="button" data-act="dec" aria-label="Giảm số lượng" ${qty <= 1 ? "disabled" : ""}>−</button>
        <span aria-live="polite">${qty}</span>
        <button type="button" data-act="inc" aria-label="Tăng số lượng" ${qty >= 20 ? "disabled" : ""}>+</button>
      </div>
      <strong class="cart-item__total">${formatVND(p.price * qty)}</strong>
    </article>`).join("");

  root.innerHTML = `
    <div class="cart-layout">
      <section class="cart-list panel" aria-label="Sản phẩm trong giỏ">${items}</section>
      <aside class="summary panel" aria-label="Tóm tắt đơn hàng">
        <h3>Tóm tắt đơn hàng</h3>
        <div class="promo">
          <input id="promo-input" type="text" placeholder="Mã giảm giá" aria-label="Mã giảm giá" autocomplete="off" value="${localStorage.getItem("bakery_promo") || ""}">
          <button type="button" class="btn btn--soft" id="promo-apply">Áp dụng</button>
        </div>
        <p class="promo-msg ${promoMsg.ok ? "ok" : "no"}" role="status">${promoMsg.text}</p>
        <div class="summary-row"><span>Tạm tính</span><span>${formatVND(t.sub)}</span></div>
        ${t.disc ? `<div class="summary-row disc"><span>Giảm giá (${t.pct}%)</span><span>−${formatVND(t.disc)}</span></div>` : ""}
        <div class="summary-row"><span>Phí giao hàng</span><span>Tính ở bước đặt hàng</span></div>
        <div class="summary-row summary-total"><span>Tổng cộng</span><span>${formatVND(t.total)}</span></div>
        <a class="btn btn--primary summary__cta" href="checkout.html">Tiến hành đặt hàng</a>
        <a class="text-link summary__back" href="products.html">← Tiếp tục chọn bánh</a>
      </aside>
    </div>
    <div class="cart-bar">
      <div><small>Tổng cộng</small><b>${formatVND(t.total)}</b></div>
      <a class="btn btn--primary" href="checkout.html">Đặt hàng</a>
    </div>`;

  if (focusSel) document.querySelector(focusSel)?.focus();
}

document.addEventListener("click", e => {
  const promoBtn = e.target.closest("#promo-apply");
  if (promoBtn) {
    const code = document.getElementById("promo-input").value.trim().toUpperCase();
    if (!code) {
      localStorage.removeItem("bakery_promo");
      promoMsg = { text: "Nhập mã giảm giá rồi bấm Áp dụng.", ok: false };
    } else if (CART_PROMOS[code]) {
      localStorage.setItem("bakery_promo", code);
      promoMsg = { text: `Đã áp dụng mã ${code}: giảm ${CART_PROMOS[code]}%.`, ok: true };
    } else {
      localStorage.removeItem("bakery_promo");
      promoMsg = { text: "Mã không hợp lệ hoặc đã hết hạn.", ok: false };
    }
    renderCart("#promo-input");
    return;
  }

  const btn = e.target.closest("[data-act]");
  const row = btn && btn.closest(".cart-item");
  if (!row) return;
  const id = Number(row.dataset.id);
  const cart = getCart();
  const it = cart.find(x => Number(x.id) === id);
  if (!it) return;
  const act = btn.dataset.act;

  if (act === "remove") {
    saveCart(cart.filter(x => Number(x.id) !== id));
    showToast("Đã xóa khỏi giỏ hàng");
    renderCart();
    return;
  }
  it.qty = act === "inc" ? Math.min(it.qty + 1, 20) : Math.max(it.qty - 1, 1);
  saveCart(cart);
  renderCart(`.cart-item[data-id="${id}"] [data-act="${act}"]:not([disabled])`);
});

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.id === "promo-input") document.getElementById("promo-apply").click();
});

document.addEventListener("DOMContentLoaded", () => renderCart());