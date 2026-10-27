/**
 * main.js
 * ---------------------------------------------------------------------------
 * Logic dùng chung cho toàn bộ website (chạy trên mọi trang):
 *  - Paths           : tính đường dẫn gốc để index.html và pages/*.html dùng chung component.
 *  - Utils           : format tiền tệ, ngày, debounce, escape HTML, đọc query string...
 *  - ComponentLoader : nạp header.html / footer.html vào các vị trí [data-component].
 *  - Navigation      : menu mobile, đánh dấu link đang active, hiệu ứng header khi cuộn.
 *  - Cart            : giỏ hàng lưu localStorage + cập nhật badge.
 *  - Toast           : thông báo nhỏ góc màn hình.
 *
 * ---------------------------------------------------------------------------
 * HỢP ĐỒNG (CONTRACT) GIỮA main.js VÀ HTML
 * ---------------------------------------------------------------------------
 *  1. Mỗi trang đặt:
 *       <body data-page="home|products|product-detail|stores|news|login">
 *       <div data-component="header"></div>
 *       <div data-component="footer"></div>
 *
 *  2. Trong component/HTML, link và ảnh nội bộ ghi theo đường dẫn TỪ THƯ MỤC GỐC:
 *       <a data-href="pages/products.html">…</a>      -> main.js gán href chính xác
 *       <img data-src="assets/logo.svg">              -> main.js gán src chính xác
 *     Nhờ đó cùng một header.html dùng được ở index.html lẫn pages/*.html.
 *
 *  3. Header cần các hook:
 *       #nav-toggle            nút hamburger (button)
 *       #main-nav              khối menu (nav)
 *       [data-nav="products"]  link menu, khớp với <body data-page="…">
 *       [data-cart-count]      badge số lượng giỏ hàng
 *       .site-header           thẻ <header> (nhận class is-scrolled khi cuộn)
 *
 *  4. Footer cần: [data-year] (năm hiện tại), form[data-newsletter-form] (đăng ký email).
 *
 *  5. Script nên nạp cuối <body>, theo thứ tự: data.js -> main.js -> js riêng của trang.
 *     Script trang có thể dùng App.onReady(fn) để chờ header/footer nạp xong.
 *
 *  Lưu ý: ComponentLoader dùng fetch() nên cần chạy qua server cục bộ
 *  (VS Code Live Server, `python -m http.server`, `npx serve`...), không mở bằng file://.
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  /* ======================================================================
   * 1. PATHS – XÁC ĐỊNH THƯ MỤC GỐC DỰ ÁN
   * ==================================================================== */

  // main.js nằm ở <root>/js/main.js, nên gốc dự án = thư mục cha của thư mục chứa script.
  const SCRIPT_EL = document.currentScript;
  const ROOT_URL = SCRIPT_EL && SCRIPT_EL.src ? new URL('../', SCRIPT_EL.src) : new URL('./', window.location.href);

  const Paths = {
    root: ROOT_URL.href,
    /** Chuyển đường dẫn tính từ gốc dự án thành URL tuyệt đối. */
    resolve(path) {
      return new URL(String(path).replace(/^\/+/, ''), ROOT_URL).href;
    },
    /** Dựng URL tới trang chi tiết sản phẩm. */
    productDetail(id) {
      return this.resolve(`pages/product-detail.html?id=${encodeURIComponent(id)}`);
    },
    /** Dựng URL tới trang danh sách sản phẩm với tham số lọc. */
    products(params = {}) {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
      return this.resolve(`pages/products.html${qs ? '?' + qs : ''}`);
    },
    /** Gán href/src thật cho mọi phần tử có data-href / data-src trong `scope`. */
    resolveAll(scope = document) {
      scope.querySelectorAll('[data-href]').forEach((el) => {
        el.setAttribute('href', this.resolve(el.dataset.href));
      });
      scope.querySelectorAll('[data-src]').forEach((el) => {
        el.setAttribute('src', this.resolve(el.dataset.src));
      });
    },
  };

  /* ======================================================================
   * 2. UTILS – HÀM TIỆN ÍCH
   * ==================================================================== */

  const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const Utils = {
    /** Chọn 1 phần tử (rút gọn querySelector). */
    $(selector, scope = document) {
      return scope.querySelector(selector);
    },
    /** Chọn nhiều phần tử, trả về mảng thật. */
    $$(selector, scope = document) {
      return Array.from(scope.querySelectorAll(selector));
    },
    /** 159000 -> "159.000 ₫" */
    formatCurrency(value) {
      return currencyFormatter.format(Number(value) || 0);
    },
    /** "2026-10-12" -> "12/10/2026" */
    formatDate(input) {
      const d = input instanceof Date ? input : new Date(input);
      return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d);
    },
    /** 1234 -> "1,2K" (cho lượt bán). */
    formatCompactNumber(value) {
      return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
    },
    /** Escape chuỗi trước khi chèn vào innerHTML để tránh XSS. */
    escapeHTML(str = '') {
      return String(str).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
    },
    /** Hạn chế gọi liên tục (dùng cho ô tìm kiếm). */
    debounce(fn, delay = 300) {
      let timer;
      return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    /** Đọc tham số query string: getQueryParam('id') */
    getQueryParam(name, fallback = '') {
      const value = new URLSearchParams(window.location.search).get(name);
      return value === null ? fallback : value;
    },
    /** Cập nhật query string mà không tải lại trang (giữ trạng thái lọc khi chia sẻ link). */
    setQueryParams(params = {}) {
      const url = new URL(window.location.href);
      Object.entries(params).forEach(([key, value]) => {
        if (value === '' || value == null) url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      });
      window.history.replaceState({}, '', url);
    },
    /** Sao đánh giá dạng chữ: 4.5 -> "★★★★☆" (làm tròn xuống nửa sao gần nhất). */
    renderStars(rating, max = 5) {
      const full = Math.round(Utils.clamp(rating, 0, max));
      return '★'.repeat(full) + '☆'.repeat(max - full);
    },
    /** Cắt chuỗi dài, thêm dấu "…". */
    truncate(text = '', length = 100) {
      return text.length > length ? text.slice(0, length).trimEnd() + '…' : text;
    },
    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
    },
    /** Tạo phần tử từ chuỗi HTML (1 phần tử gốc). */
    createElementFromHTML(html) {
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      return tpl.content.firstElementChild;
    },
  };

  /* ======================================================================
   * 3. COMPONENT LOADER – NẠP HEADER / FOOTER
   * ==================================================================== */

  class ComponentLoader {
    /** Nạp HTML của một component và trả về chuỗi. */
    static async fetchComponent(name) {
      const response = await fetch(Paths.resolve(`components/${name}.html`), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status} khi tải components/${name}.html`);
      return response.text();
    }

    /** Nạp component vào một phần tử placeholder. */
    static async mount(placeholder) {
      const name = placeholder.dataset.component;
      try {
        placeholder.innerHTML = await ComponentLoader.fetchComponent(name);
        Paths.resolveAll(placeholder);
      } catch (error) {
        console.error(`[ComponentLoader] Không thể nạp "${name}":`, error);
        placeholder.innerHTML =
          '<div class="component-error" role="alert">Không tải được thành phần giao diện. ' +
          'Hãy chạy website bằng một server cục bộ (ví dụ VS Code Live Server) thay vì mở trực tiếp file.</div>';
      }
    }

    /** Nạp tất cả [data-component] trong trang song song. */
    static mountAll() {
      const placeholders = Utils.$$('[data-component]');
      return Promise.all(placeholders.map((el) => ComponentLoader.mount(el)));
    }
  }

  /* ======================================================================
   * 4. NAVIGATION – MENU MOBILE, LINK ACTIVE, HEADER KHI CUỘN
   * ==================================================================== */

  class Navigation {
    static DESKTOP_BREAKPOINT = 992;

    constructor() {
      this.toggleBtn = Utils.$('#nav-toggle');
      this.nav = Utils.$('#main-nav');
      this.header = Utils.$('.site-header');
    }

    init() {
      this.highlightActiveLink();
      this.bindMobileMenu();
      this.bindScrollEffect();
    }

    /** Đánh dấu link menu khớp với <body data-page="…">. */
    highlightActiveLink() {
      const page = document.body.dataset.page;
      if (!page) return;
      Utils.$$('[data-nav]').forEach((link) => {
        const isActive = link.dataset.nav === page;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    setMenuOpen(open) {
      if (!this.toggleBtn || !this.nav) return;
      this.nav.classList.toggle('is-open', open);
      this.toggleBtn.classList.toggle('is-active', open);
      this.toggleBtn.setAttribute('aria-expanded', String(open));
      this.toggleBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
      document.body.classList.toggle('nav-open', open);
    }

    bindMobileMenu() {
      if (!this.toggleBtn || !this.nav) return;

      this.toggleBtn.addEventListener('click', () => {
        this.setMenuOpen(!this.nav.classList.contains('is-open'));
      });

      // Bấm vào một link trong menu thì đóng menu (mobile).
      this.nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) this.setMenuOpen(false);
      });

      // Bấm ra ngoài menu / nhấn Esc thì đóng.
      document.addEventListener('click', (event) => {
        if (!this.nav.classList.contains('is-open')) return;
        if (!event.target.closest('#main-nav') && !event.target.closest('#nav-toggle')) this.setMenuOpen(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.nav.classList.contains('is-open')) {
          this.setMenuOpen(false);
          this.toggleBtn.focus();
        }
      });

      // Quay lại kích thước desktop thì reset trạng thái menu.
      window.addEventListener('resize', () => {
        if (window.innerWidth >= Navigation.DESKTOP_BREAKPOINT) this.setMenuOpen(false);
      });
    }

    /** Thêm class is-scrolled cho header khi cuộn xuống (đổ bóng). */
    bindScrollEffect() {
      if (!this.header) return;
      const update = () => this.header.classList.toggle('is-scrolled', window.scrollY > 10);
      update();
      window.addEventListener('scroll', update, { passive: true });
    }
  }

  /* ======================================================================
   * 5. TOAST – THÔNG BÁO
   * ==================================================================== */

  const Toast = {
    container: null,

    ensureContainer() {
      if (this.container && document.body.contains(this.container)) return this.container;
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('role', 'status');
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
      return this.container;
    },

    /**
     * @param {string} message
     * @param {'success'|'error'|'info'} [type]
     * @param {number} [duration] ms
     */
    show(message, type = 'success', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      this.ensureContainer().appendChild(toast);

      // Kích hoạt transition ở frame kế tiếp.
      requestAnimationFrame(() => toast.classList.add('is-visible'));

      setTimeout(() => {
        toast.classList.remove('is-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        // Dự phòng nếu transition bị tắt (prefers-reduced-motion).
        setTimeout(() => toast.remove(), 500);
      }, duration);
    },
  };

  /* ======================================================================
   * 6. CART – GIỎ HÀNG (localStorage)
   * ==================================================================== */

  const Cart = {
    STORAGE_KEY: 'huongrung_cart_v1',

    /** @returns {{id:number, qty:number}[]} */
    getItems() {
      try {
        const parsed = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((i) => i && Number.isFinite(i.id) && i.qty > 0) : [];
      } catch (error) {
        return [];
      }
    },

    save(items) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.warn('[Cart] Không thể lưu giỏ hàng:', error);
      }
      this.updateBadge();
      document.dispatchEvent(new CustomEvent('cart:changed', { detail: { items } }));
    },

    /** Thêm sản phẩm; trả về true nếu thành công. Tự giới hạn theo tồn kho nếu có DataService. */
    add(productId, qty = 1) {
      const id = Number(productId);
      const product = global.DataService ? global.DataService.getProductById(id) : null;
      if (product && !product.inStock) {
        Toast.show('Sản phẩm này hiện đã hết hàng.', 'error');
        return false;
      }
      const items = this.getItems();
      const existing = items.find((i) => i.id === id);
      const nextQty = (existing ? existing.qty : 0) + Math.max(1, Number(qty) || 1);
      const maxQty = product ? product.stock : Infinity;

      if (existing) existing.qty = Math.min(nextQty, maxQty);
      else items.push({ id, qty: Math.min(nextQty, maxQty) });

      this.save(items);
      Toast.show(product ? `Đã thêm "${product.name}" vào giỏ hàng.` : 'Đã thêm vào giỏ hàng.');
      return true;
    },

    setQty(productId, qty) {
      const id = Number(productId);
      const items = this.getItems()
        .map((i) => (i.id === id ? { ...i, qty: Math.floor(qty) } : i))
        .filter((i) => i.qty > 0);
      this.save(items);
    },

    remove(productId) {
      this.save(this.getItems().filter((i) => i.id !== Number(productId)));
    },

    clear() {
      this.save([]);
    },

    /** Tổng số lượng sản phẩm trong giỏ. */
    count() {
      return this.getItems().reduce((sum, item) => sum + item.qty, 0);
    },

    /** Tổng tiền (cần data.js để tra giá hiện tại). */
    total() {
      if (!global.DataService) return 0;
      return this.getItems().reduce((sum, item) => {
        const product = global.DataService.getProductById(item.id);
        return product ? sum + product.currentPrice * item.qty : sum;
      }, 0);
    },

    /** Cập nhật mọi badge [data-cart-count]. */
    updateBadge() {
      const count = this.count();
      Utils.$$('[data-cart-count]').forEach((el) => {
        el.textContent = count > 99 ? '99+' : String(count);
        el.hidden = count === 0;
      });
    },
  };

  /* ======================================================================
   * 7. KHỞI TẠO ỨNG DỤNG
   * ==================================================================== */

  /** Footer: năm hiện tại + form đăng ký nhận tin. */
  function initFooter() {
    Utils.$$('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    Utils.$$('form[data-newsletter-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (!input) return;
        if (!Utils.isValidEmail(input.value)) {
          Toast.show('Vui lòng nhập địa chỉ email hợp lệ.', 'error');
          input.focus();
          return;
        }
        Toast.show('Cảm ơn bạn! Chúng tôi sẽ gửi ưu đãi mới nhất qua email.');
        form.reset();
      });
    });
  }

  /** Giữ các tab cùng trình duyệt đồng bộ badge giỏ hàng. */
  function initCartSync() {
    window.addEventListener('storage', (event) => {
      if (event.key === Cart.STORAGE_KEY) Cart.updateBadge();
    });
  }

  const readyCallbacks = [];
  let isReady = false;

  const App = {
    Paths,
    Utils,
    ComponentLoader,
    Navigation,
    Cart,
    Toast,

    /** Chạy callback sau khi header/footer đã được nạp (hoặc chạy ngay nếu đã sẵn sàng). */
    onReady(callback) {
      if (isReady) callback();
      else readyCallbacks.push(callback);
    },

    async init() {
      await ComponentLoader.mountAll();
      Paths.resolveAll(document); // phòng khi trang chính cũng dùng data-href / data-src
      new Navigation().init();
      initFooter();
      initCartSync();
      Cart.updateBadge();

      isReady = true;
      readyCallbacks.splice(0).forEach((cb) => cb());
      document.dispatchEvent(new CustomEvent('app:ready'));
    },
  };

  global.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})(window);
