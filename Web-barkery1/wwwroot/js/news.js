document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("news-grid");
  if (!grid) return;
  try {
    grid.innerHTML = '<div class="empty-state">Đang tải tin tức...</div>';
    const news = (await api.get("/news")).data;
    grid.innerHTML = news
      .map(
        (n) =>
          `<article class="article-card"><img src="${safeImage(n.image)}" alt="${escapeHtml(n.title)}"><div class="article-card__body"><span class="article-card__meta">${escapeHtml(n.category)} • ${escapeHtml(n.date)}</span><h2>${escapeHtml(n.title)}</h2><p>${escapeHtml(n.description)}</p></div></article>`,
      )
      .join("") || '<p class="empty-state">Chưa có tin tức.</p>';
  } catch (e) {
    grid.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
});
