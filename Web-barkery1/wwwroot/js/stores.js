async function renderStores() {
  const list = document.getElementById("store-list");
  if (!list) return;
  try {
    const store = (await api.get("/stores")).data[0];
    list.innerHTML = store
      ? `<article class="store-card"><img class="store-cover" data-brand-image="store" alt="Ảnh quầy bánh" style="display:none"><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml(store.address)}</p><p>Giờ mở cửa: ${escapeHtml(store.opening_time)}</p><small>● Đang hoạt động</small></article>`
      : '<div class="store-card">Chưa có thông tin vị trí quầy bánh.</div>';
    await window.applySiteBranding?.();
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}
document.addEventListener("DOMContentLoaded", renderStores);
