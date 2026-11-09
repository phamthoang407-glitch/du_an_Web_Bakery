(function () {
  const STATUS_LABEL = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang chuẩn bị",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };

  function ensureOverlay() {
    if (document.getElementById("dashboard-loading")) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="dashboard-loading" class="dashboard-loading"><div class="dashboard-loading-box"><span class="dashboard-spinner"></span><span>Đang tải dữ liệu...</span></div></div>',
    );
  }

  function loading(show) {
    ensureOverlay();
    document
      .getElementById("dashboard-loading")
      .classList.toggle("show", !!show);
  }

  function ensureModal() {
    if (document.getElementById("order-modal")) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="order-modal" class="order-modal-backdrop" role="dialog" aria-modal="true">
        <div class="order-modal">
          <div class="order-modal-head">
            <div><h3>Chi tiết đơn hàng</h3><small id="modal-order-code">-</small></div>
            <button class="order-modal-close" type="button" aria-label="Đóng">×</button>
          </div>
          <div class="order-modal-body" id="order-modal-body">
            <div class="empty-dashboard">Đang tải...</div>
          </div>
        </div>
      </div>
    `,
    );
    const modal = document.getElementById("order-modal");
    modal
      .querySelector(".order-modal-close")
      .addEventListener("click", closeOrderModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeOrderModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeOrderModal();
    });
  }

  function closeOrderModal() {
    document.getElementById("order-modal")?.classList.remove("open");
  }

  async function showOrderDetail(id) {
    ensureModal();
    const modal = document.getElementById("order-modal");
    const body = document.getElementById("order-modal-body");
    body.innerHTML =
      '<div class="empty-dashboard">Đang tải chi tiết đơn...</div>';
    modal.classList.add("open");
    try {
      const result = await api.get("/orders/" + id);
      const o = result.data;
      document.getElementById("modal-order-code").textContent =
        o.code || "Đơn #" + id;
      body.innerHTML = `
        <div class="order-detail-grid">
          <div class="order-detail-box"><small>KHÁCH HÀNG</small><b>${escapeHtml(o.customer_name || "-")}</b></div>
          <div class="order-detail-box"><small>TRẠNG THÁI</small><b>${STATUS_LABEL[o.status] || o.status}</b></div>
          <div class="order-detail-box"><small>SỐ ĐIỆN THOẠI</small><b>${escapeHtml(o.customer_phone || "-")}</b></div>
          <div class="order-detail-box"><small>ĐỊA CHỈ GIAO HÀNG</small><b>${escapeHtml(o.shipping_address || "-")}</b></div>
        </div>
        <table class="order-detail-items">
          <thead><tr><th>SẢN PHẨM</th><th>SL</th><th>THÀNH TIỀN</th></tr></thead>
          <tbody>${(o.items || [])
            .map(
              (i) => `
            <tr><td>${escapeHtml(i.product_name || "-")}</td><td>${i.quantity}</td><td>${formatVND(i.price * i.quantity)}</td></tr>
          `,
            )
            .join("")}</tbody>
        </table>
        <div class="order-detail-total"><span>Tổng cộng</span><strong>${formatVND(o.total_amount || 0)}</strong></div>
      `;
      const next = {PENDING:"CONFIRMED",CONFIRMED:"PROCESSING",PROCESSING:"SHIPPING",SHIPPING:"COMPLETED"}[o.status];
      const actions = document.createElement("div"); actions.className = "management-actions";
      for (const status of [next, ...(["PENDING","CONFIRMED","PROCESSING"].includes(o.status) ? ["CANCELLED"] : [])].filter(Boolean)) {
        const b = document.createElement("button"); b.className="action-btn"; b.textContent = STATUS_LABEL[status];
        b.onclick = async () => { if(status === "CANCELLED" && !confirm("Hủy đơn và hoàn tồn kho?")) return; b.disabled=true;
          try {await api.put(`/orders/${o.id}/status`,{status}); await showOrderDetail(o.id); if(document.body.classList.contains("staff-dashboard")) await renderStaffOrders(); else await renderOwnerDashboard();}
          catch(e){showToast(e.message); b.disabled=false;}
        }; actions.append(b);
      }
      body.append(actions);
    } catch (e) {
      body.innerHTML = `<div class="empty-dashboard">${escapeHtml(e.message || "Không tải được đơn hàng.")}</div>`;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );
  }

  document.addEventListener("click", async (e) => {
    const detail = e.target.closest(".admin-table .mini-btn[data-order-id]");
    if (detail) showOrderDetail(detail.dataset.orderId);
    const logout = e.target.closest('a[href="login.html"]');
    if (logout && logout.textContent.includes("Đăng xuất")) {
      e.preventDefault();
      try { await api.post("/auth/logout", {}); } catch(e) { showToast(e.message); return; }
      clearAuth();
      location.href = "login.html";
    }
    const filter = e.target.closest(".filter-pills button");
    if (filter) {
      document
        .querySelectorAll(".filter-pills button")
        .forEach((b) => b.classList.toggle("active", b === filter));
      applyStaffFilter();
    }
  });
  function applyStaffFilter() {
    const selected = document
      .querySelector(".filter-pills .active")
      ?.textContent.trim();
    document
      .querySelectorAll(".staff-dashboard #orders tbody tr")
      .forEach((row) => {
        const status = row.querySelector(".status")?.textContent.trim();
        row.hidden = selected && selected !== "Tất cả" && selected !== status;
      });
  }
  window.applyStaffFilter = applyStaffFilter;
  window.showOrderDetail = showOrderDetail;
  window.closeOrderModal = closeOrderModal;
})();
