/**
 * products.js
 * ---------------------------------------------------------------------------
 * Logic của module Sản phẩm, dùng cho 2 trang (tự nhận biết trang nào đang mở):
 *
 *  1. pages/products.html        -> ProductListPage
 *       - Tìm kiếm (debounce), lọc theo loại bánh / hương vị / khoảng giá /
 *         giảm giá / còn hàng / có sẵn trong ngày, sắp xếp, phân trang.
 *       - Trạng thái lọc được đồng bộ lên URL (chia sẻ link, nút Back/Reload không mất lọc):
 *           ?keyword=&category=&flavor=&price=&sale=1&stock=1&today=1&sort=&page=
 *       - Bộ lọc là drawer trượt trên mobile, sidebar cố định trên desktop.
 *
 *  2. pages/product-detail.html  -> ProductDetailPage
 *       - Đọc ?id=…, dựng thư viện ảnh, giá, số lượng, thêm vào giỏ, tab thông tin,
 *         bảng thông số và sản phẩm liên quan.
 *
 * Phụ thuộc (nạp trước): js/data.js (DataService, AppData) và js/main.js (App).
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const { DataService, AppData, App } = window;
  const { Utils, Paths, Templates, Cart } = App;

  const esc = Utils.escapeHTML;
  const $ = (selector, scope) => Utils.$(selector, scope);
  const $$ = (selector, scope) => Utils.$$(selector, scope);
  const SITE_NAME = AppData.SITE.name;
  const DESKTOP_QUERY = '(min-width: 992px)';

  /* ======================================================================
   * CẤU HÌNH LỌC
   * ==================================================================== */

  /** Các khoảng giá (đơn vị ₫). `id` được lưu trên URL (?price=). */
  const PRICE_RANGES = Object.freeze([
    { id: '', label: 'Tất cả mức giá' },
    { id: 'lt150', label: 'Dưới 150.000 ₫', min: 0, max: 149999 },
    { id: '150-300', label: '150.000 – 300.000 ₫', min: 150000, max: 300000 },
    { id: '300-500', label: '300.000 – 500.000 ₫', min: 300001, max: 500000 },
    { id: 'gt500', label: 'Trên 500.000 ₫', min: 500001, max: Infinity },
  ]);

  const defaultState = () => ({
    keyword: '',
    category: '',
    flavor: '',
    price: '',
    onSale: false,
    inStockOnly: false,
    readyToday: false,
    sortBy: 'newest',
    page: 1,
  });

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
   * TIỆN ÍCH DÙNG CHUNG CỦA MODULE
   * ==================================================================== */

  /**
   * Tabs theo chuẩn WAI-ARIA: mỗi [role="tab"] có aria-controls trỏ tới một [role="tabpanel"].
   * Hỗ trợ bàn phím: ← → Home End.
   */
  function initTabs(tablist) {
    const tabs = $$('[role="tab"]', tablist);

    function select(tab, moveFocus = false) {
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        let next = null;
        if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
        if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = last;
        if (next === null) return;
        event.preventDefault();
        select(tabs[next], true);
      });
    });

    select(tabs[0]);
  }

  /* ======================================================================
   * TRANG DANH SÁCH SẢN PHẨM
   * ==================================================================== */

  class ProductListPage {
    static PER_PAGE = 9;

    constructor() {
      this.el = {
        title: $('#page-title'),
        catalog: $('#catalog'),
        grid: $('#product-grid'),
        count: $('#result-count'),
        chips: $('#active-filters'),
        pagination: $('#pagination'),
        filterForm: $('#filter-form'),
        searchForm: $('#search-form'),
        searchInput: $('#product-search'),
        searchClear: $('#search-clear'),
        sort: $('#sort-select'),
        drawer: $('#filters'),
        backdrop: $('#filters-backdrop'),
        openBtn: $('#filters-open'),
        closeBtn: $('#filters-close'),
        applyBtn: $('#filters-apply'),
      };
      this.state = this.readStateFromURL();
    }

    init() {
      this.renderFilterOptions();
      this.syncControls();
      this.bindEvents();
      this.apply();
    }

    /* ----------------------------- Trạng thái ----------------------------- */

    /** Đọc và kiểm tra hợp lệ các tham số trên URL. */
    readStateFromURL() {
      const q = (name) => Utils.getQueryParam(name, '');
      const state = defaultState();

      state.keyword = q('keyword').trim();
      if (AppData.CATEGORIES.some((c) => c.id === q('category'))) state.category = q('category');
      if (AppData.FLAVORS.some((f) => f.id === q('flavor'))) state.flavor = q('flavor');
      if (PRICE_RANGES.some((r) => r.id && r.id === q('price'))) state.price = q('price');
      if (AppData.SORT_OPTIONS.some((o) => o.value === q('sort'))) state.sortBy = q('sort');
      state.onSale = q('sale') === '1';
      state.inStockOnly = q('stock') === '1';
      state.readyToday = q('today') === '1';

      const page = parseInt(q('page'), 10);
      if (page > 0) state.page = page;
      return state;
    }

    writeStateToURL() {
      const s = this.state;
      Utils.setQueryParams({
        keyword: s.keyword,
        category: s.category,
        flavor: s.flavor,
        price: s.price,
        sale: s.onSale ? '1' : '',
        stock: s.inStockOnly ? '1' : '',
        today: s.readyToday ? '1' : '',
        sort: s.sortBy === 'newest' ? '' : s.sortBy,
        page: s.page > 1 ? String(s.page) : '',
      });
    }

    /** Danh sách sau khi áp dụng toàn bộ bộ lọc + sắp xếp. */
    query() {
      const s = this.state;
      const range = PRICE_RANGES.find((r) => r.id === s.price);
      return DataService.getProducts({
        keyword: s.keyword,
        category: s.category,
        flavor: s.flavor,
        minPrice: range && range.min != null ? range.min : 0,
        maxPrice: range && range.max != null ? range.max : Infinity,
        onSale: s.onSale,
        inStockOnly: s.inStockOnly,
        readyToday: s.readyToday,
        sortBy: s.sortBy,
      });
    }

    /* ------------------------------ Vẽ bộ lọc ----------------------------- */

    /** Sinh các lựa chọn bộ lọc từ dữ liệu (không gõ cứng trong HTML). */
    renderFilterOptions() {
      const option = (name, value, label, count) => `
        <label class="filter-option">
          <input type="radio" name="${name}" value="${esc(value)}">
          <span class="filter-option__label">${esc(label)}</span>
          ${count == null ? '' : `<span class="filter-option__count">${count}</span>`}
        </label>`;

      const total = AppData.PRODUCTS.length;

      $('#filter-category').innerHTML =
        option('category', '', 'Tất cả', total) +
        DataService.getCategoriesWithCount()
          .map((c) => option('category', c.id, c.name, c.count))
          .join('');

      $('#filter-flavor').innerHTML =
        option('flavor', '', 'Tất cả hương vị', null) +
        AppData.FLAVORS.map((f) => option('flavor', f.id, f.name, AppData.PRODUCTS.filter((p) => p.flavor === f.id).length)).join('');

      $('#filter-price').innerHTML = PRICE_RANGES.map((r) => option('price', r.id, r.label, null)).join('');

      this.el.sort.innerHTML = AppData.SORT_OPTIONS.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    }

    /** Đưa state hiện tại lên các control (dùng khi tải trang và khi reset). */
    syncControls() {
      const { filterForm, searchInput, searchClear, sort } = this.el;
      ['category', 'flavor', 'price'].forEach((name) => {
        $$(`input[name="${name}"]`, filterForm).forEach((radio) => {
          radio.checked = radio.value === this.state[name];
        });
      });
      filterForm.elements.sale.checked = this.state.onSale;
      filterForm.elements.stock.checked = this.state.inStockOnly;
      filterForm.elements.today.checked = this.state.readyToday;

      searchInput.value = this.state.keyword;
      searchClear.hidden = !this.state.keyword;
      sort.value = this.state.sortBy;
    }

    /** Đọc các control của form bộ lọc vào state. */
    readFilterForm() {
      const { filterForm } = this.el;
      const checked = (name) => {
        const radio = $(`input[name="${name}"]:checked`, filterForm);
        return radio ? radio.value : '';
      };
      this.state.category = checked('category');
      this.state.flavor = checked('flavor');
      this.state.price = checked('price');
      this.state.onSale = filterForm.elements.sale.checked;
      this.state.inStockOnly = filterForm.elements.stock.checked;
      this.state.readyToday = filterForm.elements.today.checked;
    }

    /* ------------------------------- Sự kiện ------------------------------ */

    bindEvents() {
      const { filterForm, searchForm, searchInput, searchClear, sort, chips, pagination } = this.el;

      filterForm.addEventListener('change', () => {
        this.readFilterForm();
        this.state.page = 1;
        this.apply();
      });
      filterForm.addEventListener('submit', (event) => event.preventDefault());

      // Tìm kiếm: gõ là lọc (debounce 250ms), Enter lọc ngay.
      const commitSearch = () => {
        const keyword = searchInput.value.trim();
        searchClear.hidden = !searchInput.value;
        if (keyword === this.state.keyword) return;
        this.state.keyword = keyword;
        this.state.page = 1;
        this.apply();
      };
      searchInput.addEventListener('input', Utils.debounce(commitSearch, 250));
      searchInput.addEventListener('input', () => {
        searchClear.hidden = !searchInput.value;
      });
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        commitSearch();
      });
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        commitSearch();
        searchInput.focus();
      });

      sort.addEventListener('change', () => {
        this.state.sortBy = sort.value;
        this.state.page = 1;
        this.apply();
      });

      // Mọi nút "Xóa bộ lọc" (sidebar, trạng thái rỗng).
      document.addEventListener('click', (event) => {
        if (event.target.closest('[data-reset-filters]')) this.reset();
      });

      // Bỏ từng bộ lọc bằng chip.
      chips.addEventListener('click', (event) => {
        const button = event.target.closest('[data-clear]');
        if (!button) return;
        const clearers = {
          keyword: () => (this.state.keyword = ''),
          category: () => (this.state.category = ''),
          flavor: () => (this.state.flavor = ''),
          price: () => (this.state.price = ''),
          sale: () => (this.state.onSale = false),
          stock: () => (this.state.inStockOnly = false),
          today: () => (this.state.readyToday = false),
        };
        if (button.dataset.clear === 'all') {
          this.reset();
          return;
        }
        if (clearers[button.dataset.clear]) clearers[button.dataset.clear]();
        this.state.page = 1;
        this.syncControls();
        this.apply();
      });

      pagination.addEventListener('click', (event) => {
        const button = event.target.closest('[data-page]');
        if (!button || button.disabled) return;
        this.state.page = Number(button.dataset.page);
        this.apply({ scroll: true });
      });

      this.bindDrawer();
    }

    reset() {
      this.state = defaultState();
      this.syncControls();
      this.apply();
    }

    /* ------------------------ Drawer bộ lọc (mobile) ----------------------- */

    bindDrawer() {
      const { drawer, backdrop, openBtn, closeBtn, applyBtn } = this.el;
      const desktop = window.matchMedia(DESKTOP_QUERY);

      openBtn.addEventListener('click', () => this.openDrawer());
      closeBtn.addEventListener('click', () => this.closeDrawer());
      applyBtn.addEventListener('click', () => this.closeDrawer());
      backdrop.addEventListener('click', () => this.closeDrawer());

      document.addEventListener('keydown', (event) => {
        if (!drawer.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
          this.closeDrawer();
          return;
        }
        // Giữ focus trong drawer khi đang mở (focus trap).
        if (event.key === 'Tab') {
          const focusable = $$('a[href], button:not([disabled]), input, select, textarea', drawer).filter((el) => el.offsetParent !== null);
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      });

      // Chuyển sang desktop thì đóng drawer, trả lại cuộn trang.
      desktop.addEventListener('change', (event) => {
        if (event.matches) this.closeDrawer({ restoreFocus: false });
      });
    }

    openDrawer() {
      const { drawer, backdrop, openBtn, closeBtn } = this.el;
      drawer.classList.add('is-open');
      backdrop.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('filters-open');
      closeBtn.focus();
    }

    closeDrawer({ restoreFocus = true } = {}) {
      const { drawer, backdrop, openBtn } = this.el;
      if (!drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      backdrop.hidden = true;
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('filters-open');
      if (restoreFocus) openBtn.focus();
    }

    /* ------------------------------ Hiển thị ------------------------------ */

    /** Tính lại kết quả và vẽ lại toàn bộ trang. */
    apply({ scroll = false } = {}) {
      const list = this.query();
      const pageData = DataService.paginate(list, this.state.page, ProductListPage.PER_PAGE);
      this.state.page = pageData.page; // tự chỉnh nếu ?page= vượt quá số trang

      this.writeStateToURL();
      Templates.renderInto(this.el.grid, pageData.items, (p) => Templates.productCard(p), this.emptyHTML());
      this.renderHeading();
      this.renderCount(list.length, pageData);
      this.renderChips();
      this.renderPagination(pageData);

      if (scroll) {
        this.el.catalog.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    }

    emptyHTML() {
      return `
        <div class="catalog__empty">
          ${Templates.emptyState('Không tìm thấy bánh phù hợp', 'Hãy thử bỏ bớt bộ lọc hoặc dùng từ khóa khác nhé.')}
          <button class="btn btn--primary" type="button" data-reset-filters>Xóa bộ lọc</button>
        </div>`;
    }

    renderHeading() {
      const { category, keyword } = this.state;
      const cat = AppData.CATEGORIES.find((c) => c.id === category);
      const title = cat ? cat.name : keyword ? `Kết quả cho “${keyword}”` : 'Tất cả bánh';
      this.el.title.textContent = title;
      document.title = `${title} – ${SITE_NAME}`;
    }

    renderCount(total, { page, totalPages }) {
      this.el.count.textContent = `${total} sản phẩm${totalPages > 1 ? ` · Trang ${page}/${totalPages}` : ''}`;
      this.el.applyBtn.textContent = `Xem ${total} sản phẩm`;
    }

    /** Các chip bộ lọc đang bật, bấm để bỏ từng bộ lọc. */
    renderChips() {
      const s = this.state;
      const cat = AppData.CATEGORIES.find((c) => c.id === s.category);
      const flavor = AppData.FLAVORS.find((f) => f.id === s.flavor);
      const range = PRICE_RANGES.find((r) => r.id === s.price);

      const items = [
        s.keyword && { key: 'keyword', label: `Từ khóa: “${s.keyword}”` },
        cat && { key: 'category', label: cat.name },
        flavor && { key: 'flavor', label: flavor.name },
        s.price && range && { key: 'price', label: range.label },
        s.onSale && { key: 'sale', label: 'Đang giảm giá' },
        s.inStockOnly && { key: 'stock', label: 'Còn hàng' },
        s.readyToday && { key: 'today', label: 'Có sẵn trong ngày' },
      ].filter(Boolean);

      this.el.chips.innerHTML = items.length
        ? items
            .map(
              (item) => `
                <button class="chip" type="button" data-clear="${item.key}">
                  ${esc(item.label)} <span aria-hidden="true">×</span><span class="sr-only">Bỏ bộ lọc</span>
                </button>`
            )
            .join('') + '<button class="chip chip--clear" type="button" data-clear="all">Xóa tất cả</button>'
        : '';
    }

    /** Dãy số trang rút gọn: 1 … 4 5 6 … 12 */
    pageWindow(current, total) {
      const pages = [...new Set([1, total, current - 1, current, current + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
      return pages.reduce((result, p, i) => {
        if (i > 0 && p - pages[i - 1] > 1) result.push('…');
        result.push(p);
        return result;
      }, []);
    }

    renderPagination({ page, totalPages }) {
      const nav = this.el.pagination;
      if (totalPages <= 1) {
        nav.innerHTML = '';
        nav.hidden = true;
        return;
      }
      nav.hidden = false;

      const numbers = this.pageWindow(page, totalPages)
        .map((p) =>
          p === '…'
            ? '<span class="pagination__gap" aria-hidden="true">…</span>'
            : `<button class="pagination__btn${p === page ? ' is-active' : ''}" type="button" data-page="${p}"
                 ${p === page ? 'aria-current="page"' : ''} aria-label="Trang ${p}">${p}</button>`
        )
        .join('');

      nav.innerHTML = `
        <button class="pagination__btn" type="button" data-page="${page - 1}" aria-label="Trang trước" ${page === 1 ? 'disabled' : ''}>‹</button>
        ${numbers}
        <button class="pagination__btn" type="button" data-page="${page + 1}" aria-label="Trang sau" ${page === totalPages ? 'disabled' : ''}>›</button>`;
    }
  }

  /* ======================================================================
   * TRANG CHI TIẾT SẢN PHẨM
   * ==================================================================== */

  class ProductDetailPage {
    static MAX_QTY = 20;

    constructor() {
      this.root = $('#product-detail');
      this.product = DataService.getProductById(Utils.getQueryParam('id'));
    }

    init() {
      if (!this.product) {
        this.renderNotFound();
        return;
      }
      this.updateMeta();
      this.renderBreadcrumb();
      this.root.innerHTML = this.template();
      this.root.removeAttribute('aria-busy');

      this.bindGallery();
      this.bindPurchase();
      initTabs($('#detail-tablist'));
      this.renderRelated();
    }

    /* ------------------------------ Metadata ------------------------------ */

    updateMeta() {
      const p = this.product;
      document.title = `${p.name} – ${SITE_NAME}`;
      const description = $('meta[name="description"]');
      if (description) description.setAttribute('content', p.shortDescription);

      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.shortDescription,
        category: p.categoryName,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: p.currentPrice,
          availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(ld).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    renderBreadcrumb() {
      const p = this.product;
      $('#detail-breadcrumb').innerHTML = `
        <li><a href="${Paths.resolve('index.html')}">Trang chủ</a></li>
        <li><a href="${Paths.resolve('pages/products.html')}">Sản phẩm</a></li>
        <li><a href="${Paths.products({ category: p.category })}">${esc(p.categoryName)}</a></li>
        <li><span aria-current="page">${esc(p.name)}</span></li>`;
    }

    renderNotFound() {
      document.title = `Không tìm thấy sản phẩm – ${SITE_NAME}`;
      $('#detail-breadcrumb').innerHTML = `
        <li><a href="${Paths.resolve('index.html')}">Trang chủ</a></li>
        <li><a href="${Paths.resolve('pages/products.html')}">Sản phẩm</a></li>
        <li><span aria-current="page">Không tìm thấy</span></li>`;
      this.root.removeAttribute('aria-busy');
      this.root.classList.add('product-detail--empty');
      this.root.innerHTML = `
        ${Templates.emptyState('Không tìm thấy sản phẩm', 'Sản phẩm bạn tìm có thể đã ngừng bán hoặc đường dẫn không đúng.')}
        <p class="text-center mt-4"><a class="btn btn--primary" href="${Paths.resolve('pages/products.html')}">Xem tất cả bánh</a></p>`;
      const related = $('#related-section');
      if (related) related.hidden = true;
      const tabs = $('#detail-extra');
      if (tabs) tabs.hidden = true;
    }

    /* ------------------------------- Giao diện ----------------------------- */

    stockInfo() {
      const p = this.product;
      if (!p.inStock) return { cls: 'is-out', text: 'Hôm nay đã hết hàng' };
      if (p.stock <= 10) return { cls: 'is-low', text: `Chỉ còn ${p.stock} sản phẩm` };
      return { cls: '', text: 'Còn hàng' };
    }

    template() {
      const p = this.product;
      const stock = this.stockInfo();
      const maxQty = Math.max(1, Math.min(p.stock, ProductDetailPage.MAX_QTY));
      const rating = p.rating.toFixed(1).replace('.', ',');

      const thumbs = p.images
        .map(
          (src, i) => `
            <li>
              <button class="gallery__thumb${i === 0 ? ' is-active' : ''}" type="button" data-index="${i}" aria-label="Xem ảnh ${i + 1}" aria-pressed="${i === 0}">
                <img src="${esc(src)}" alt="" width="120" height="120" loading="lazy">
              </button>
            </li>`
        )
        .join('');

      const badges = [];
      if (p.isOnSale) badges.push(`<span class="badge badge--sale">-${p.discountPercent}%</span>`);
      if (p.badge && p.badge !== 'Giảm giá') badges.push(`<span class="badge ${p.badge === 'Mới' ? 'badge--new' : 'badge--hot'}">${esc(p.badge)}</span>`);

      const perks = [
        `Miễn phí giao hàng cho đơn từ ${Utils.formatCurrency(AppData.SITE.freeShipThreshold)}`,
        p.category === 'banh-kem' ? 'Viết chữ chúc mừng miễn phí, tặng nến và dao cắt bánh' : 'Nướng mới mỗi sáng, không chất bảo quản',
        'Giao lạnh tận nơi, đóng gói cẩn thận',
      ];

      return `
        <div class="detail__gallery">
          <div class="gallery__main">
            <img id="gallery-main" src="${esc(p.images[0])}" alt="${esc(p.name)}" width="600" height="600">
            ${badges.length ? `<div class="product-card__badges">${badges.join('')}</div>` : ''}
          </div>
          ${p.images.length > 1 ? `<ul class="gallery__thumbs" aria-label="Ảnh sản phẩm">${thumbs}</ul>` : ''}
        </div>

        <div class="detail__info">
          <a class="tag" href="${Paths.products({ category: p.category })}">${esc(p.categoryName)}</a>
          <h1 class="detail__title">${esc(p.name)}</h1>

          <p class="detail__rating">
            <span class="rating__stars" aria-hidden="true">${Utils.renderStars(p.rating)}</span>
            <span><strong>${rating}</strong> · ${p.reviews} đánh giá · Đã bán ${p.sold.toLocaleString('vi-VN')}</span>
            <span class="sr-only">Đánh giá ${rating} trên 5 từ ${p.reviews} lượt</span>
          </p>

          <p class="detail__price">
            <span class="detail__price-current">${Utils.formatCurrency(p.currentPrice)}</span>
            ${p.isOnSale ? `<span class="price__old">${Utils.formatCurrency(p.price)}</span><span class="badge badge--sale">Tiết kiệm ${p.discountPercent}%</span>` : ''}
          </p>

          <p class="detail__short">${esc(p.shortDescription)}</p>

          <dl class="detail__facts">
            <div><dt>Kích thước</dt><dd>${esc(p.size)}</dd></div>
            <div><dt>Phù hợp</dt><dd>${esc(p.serves)}</dd></div>
            <div><dt>Hương vị</dt><dd>${esc(p.flavorName)}</dd></div>
            <div><dt>Danh mục</dt><dd>${esc(p.categoryName)}</dd></div>
            <div class="detail__facts-wide"><dt>Bảo quản &amp; hạn dùng</dt><dd>${esc(p.shelfLife)}</dd></div>
          </dl>

          <p class="detail__notice${p.requiresPreorder ? ' is-preorder' : ''}">
            <strong>${esc(p.leadTimeLabel)}.</strong>
            ${p.requiresPreorder ? 'Vui lòng đặt trước để tiệm kịp chuẩn bị bánh tươi cho bạn.' : 'Bánh nướng sẵn trong ngày, có thể nhận ngay tại tiệm.'}
          </p>

          <p class="detail__stock ${stock.cls}">${esc(stock.text)}</p>

          <div class="detail__buy">
            <div class="qty" role="group" aria-label="Số lượng">
              <button class="qty__btn" type="button" data-qty-step="-1" aria-label="Giảm số lượng">−</button>
              <input class="qty__input" id="qty-input" type="number" inputmode="numeric" min="1" max="${maxQty}" value="1" aria-label="Số lượng" ${p.inStock ? '' : 'disabled'}>
              <button class="qty__btn" type="button" data-qty-step="1" aria-label="Tăng số lượng">+</button>
            </div>
            <button class="btn btn--primary btn--lg detail__add" id="add-to-cart" type="button" ${p.inStock ? '' : 'disabled'}>
              ${p.inStock ? 'Thêm vào giỏ' : 'Hết hàng hôm nay'}
            </button>
          </div>

          <a class="btn btn--outline btn--block" href="tel:${AppData.SITE.hotline.replace(/\s/g, '')}">Gọi đặt bánh: ${esc(AppData.SITE.hotline)}</a>

          <ul class="detail__perks">${perks.map((text) => `<li>${esc(text)}</li>`).join('')}</ul>
        </div>

        ${this.extraTemplate()}`;
    }

    /** Khối tab (mô tả / thành phần / thông số) nằm dưới phần mua hàng. */
    extraTemplate() {
      const p = this.product;
      const specs = Object.entries(p.specs)
        .map(([key, value]) => `<tr><th scope="row">${esc(key)}</th><td>${esc(value)}</td></tr>`)
        .join('');

      return `
        <section class="detail-extra" id="detail-extra" aria-label="Thông tin chi tiết">
          <div class="tabs" id="detail-tablist" role="tablist" aria-label="Thông tin chi tiết sản phẩm">
            <button class="tabs__tab" type="button" role="tab" id="dtab-desc" aria-controls="dpanel-desc" aria-selected="true">Mô tả</button>
            <button class="tabs__tab" type="button" role="tab" id="dtab-ingredients" aria-controls="dpanel-ingredients" aria-selected="false">Thành phần &amp; dị ứng</button>
            <button class="tabs__tab" type="button" role="tab" id="dtab-specs" aria-controls="dpanel-specs" aria-selected="false">Thông số</button>
          </div>

          <div class="tabpanel" role="tabpanel" id="dpanel-desc" aria-labelledby="dtab-desc" tabindex="0">
            <p>${esc(p.description)}</p>
            <ul class="feature-list">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          </div>

          <div class="tabpanel" role="tabpanel" id="dpanel-ingredients" aria-labelledby="dtab-ingredients" tabindex="0" hidden>
            <h2 class="tabpanel__title">Thành phần</h2>
            <ul class="chip-list">${p.ingredients.map((i) => `<li class="tag">${esc(i)}</li>`).join('')}</ul>
            <p class="allergen-note">
              <strong>Chứa chất gây dị ứng:</strong> ${esc(p.allergens.join(', '))}.
              Sản phẩm được chế biến trong bếp có sử dụng nhiều nguyên liệu khác nên có thể chứa vết của các chất gây dị ứng khác.
            </p>
          </div>

          <div class="tabpanel" role="tabpanel" id="dpanel-specs" aria-labelledby="dtab-specs" tabindex="0" hidden>
            <table class="spec-table"><tbody>${specs}</tbody></table>
          </div>
        </section>`;
    }

    /* -------------------------------- Sự kiện ------------------------------ */

    bindGallery() {
      const main = $('#gallery-main');
      const thumbs = $$('.gallery__thumb');
      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const index = Number(thumb.dataset.index);
          main.src = this.product.images[index];
          main.alt = `${this.product.name} – ảnh ${index + 1}`;
          thumbs.forEach((t) => {
            const active = t === thumb;
            t.classList.toggle('is-active', active);
            t.setAttribute('aria-pressed', String(active));
          });
        });
      });
    }

    bindPurchase() {
      const input = $('#qty-input');
      const max = Number(input.max);
      const setQty = (value) => {
        const n = Math.floor(Number(value));
        input.value = Utils.clamp(Number.isFinite(n) ? n : 1, 1, max);
      };

      $$('[data-qty-step]').forEach((button) => {
        button.addEventListener('click', () => {
          if (input.disabled) return;
          setQty(Number(input.value) + Number(button.dataset.qtyStep));
        });
      });
      input.addEventListener('change', () => setQty(input.value));

      $('#add-to-cart').addEventListener('click', () => {
        setQty(input.value);
        Cart.add(this.product.id, Number(input.value));
      });
    }

    renderRelated() {
      const section = $('#related-section');
      const related = DataService.getRelatedProducts(this.product.id, 4);
      if (!related.length) {
        section.hidden = true;
        return;
      }
      Templates.renderInto($('#related-products'), related, (p) => Templates.productCard(p));
    }
  }

  /* ======================================================================
   * KHỞI CHẠY: nhận biết trang đang mở qua phần tử đặc trưng
   * ==================================================================== */

  if ($('#product-grid')) new ProductListPage().init();
  else if ($('#product-detail')) new ProductDetailPage().init();
})();
