(function () {
  let active = null;
  const fallback = {
    ShopName: 'BAKERY',
    Tagline: 'TIỆM BÁNH THỦ CÔNG · FRESH BAKERY',
    Title: 'Một chút bánh ngon,',
    Highlight: 'thêm nhiều niềm vui.',
    Description: 'Khám phá bánh kem, bánh ngọt và bánh mì thơm mềm, được chọn lựa cẩn thận cho những khoảnh khắc đáng nhớ.',
    HeroImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85',
    LogoImage: '/images/bakery-logo.svg', StoreImage: ''
  };
  async function fetchSettings(force = false) {
    if (active && !force) return active;
    const r = await fetch('/api/site-branding', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) throw new Error('Không tải được cấu hình website.');
    const body = await r.json();
    // ASP.NET Core returns camelCase JSON by default, while the editor uses PascalCase.
    // Normalize both formats so saves and subsequent reads match reliably.
    const raw = body.data || {};
    const normalized = {};
    for (const key of Object.keys(fallback)) {
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      if (Object.prototype.hasOwnProperty.call(raw, key)) normalized[key] = raw[key];
      else if (Object.prototype.hasOwnProperty.call(raw, camel)) normalized[key] = raw[camel];
    }
    active = { ...fallback, ...normalized };
    return active;
  }
  function freshImageUrl(src) {
    if (!src || !src.startsWith('/uploads/branding/')) return src;
    const u = new URL(src, location.origin);
    // A unique upload name is used for every save; parameter prevents stale proxies.
    u.searchParams.set('v', src.split('/').pop());
    return u.pathname + u.search;
  }
  async function apply(force = false) {
    try {
      const d = await fetchSettings(force);
      const textFields = { shopName: 'ShopName', tagline: 'Tagline', title: 'Title', highlight: 'Highlight', description: 'Description' };
      Object.entries(textFields).forEach(([key, prop]) => {
        document.querySelectorAll(`[data-brand="${key}"]`).forEach(el => el.textContent = d[prop]);
      });
      const images = { hero: d.HeroImage, store: d.StoreImage };
      Object.entries(images).forEach(([key, src]) => {
        document.querySelectorAll(`[data-brand-image="${key}"]`).forEach(el => {
          if (src) { el.src = freshImageUrl(src); el.style.display = ''; }
          else if (key === 'store') { el.style.display = 'none'; }
        });
      });
      document.querySelectorAll('.brand__logo').forEach(el => { if (d.LogoImage) el.src = freshImageUrl(d.LogoImage); });
      document.querySelectorAll('.brand strong, .admin-brand b').forEach(el => { el.textContent = d.ShopName; });
      return d;
    } catch (e) { console.warn(e.message); return null; }
  }
  window.fetchSiteBranding = fetchSettings;
  window.applySiteBranding = apply;
  document.addEventListener('DOMContentLoaded', () => apply());
})();
