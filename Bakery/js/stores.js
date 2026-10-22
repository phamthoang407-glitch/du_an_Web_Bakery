/**
 * stores.js
 * ---------------------------------------------------------------------------
 * Logic trang Hệ thống cửa hàng (pages/stores.html).
 *
 *  - Tìm kiếm (không dấu, debounce), lọc theo thành phố, dịch vụ, "đang mở cửa".
 *  - Hiển thị trạng thái mở/đóng cửa theo giờ hiện tại và tự cập nhật mỗi phút.
 *  - Chọn một cửa hàng để xem vị trí trên bản đồ (OpenStreetMap nhúng iframe).
 *  - Trạng thái lọc được đồng bộ lên URL:  ?city=&keyword=&service=&open=1&id=
 *    (trang chủ link tới trang này bằng ?city=Hà%20Nội).
 *
 * Phụ thuộc (nạp trước): js/data.js (DataService, AppData) và js/main.js (App).
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const { DataService, AppData, App } = window;
  const { Utils, Templates } = App;

  const esc = Utils.escapeHTML;
  const $ = (selector, scope) => Utils.$(selector, scope);
  const $$ = (selector, scope) => Utils.$$(selector, scope);
  const SITE_NAME = AppData.SITE.name;
  const DESKTOP_QUERY = '(min-width: 992px)';
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const icon = (paths) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    pin: icon('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
    phone: icon(
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'
    ),
    clock: icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  };

  const defaultState = () => ({ keyword: '', city: '', service: '', openNow: false, id: 0 });

  class StoresPage {
    constructor() {
      this.el = {
        form: $('#stores-form'),
        search: $('#store-search'),
        city: $('#store-city'),
        service: $('#store-service'),
        open: $('#store-open'),
        count: $('#store-count'),
        list: $('#store-list'),
        map: $('#store-map'),
        mapFrame: $('#map-frame'),
        mapInfo: $('#map-info'),
      };
      this.desktop = window.matchMedia(DESKTOP_QUERY);
      this.state = this.readStateFromURL();
      this.visible = [];
    }

    init() {
      this.renderOptions();
      this.syncControls();
      this.bindEvents();
      this.apply();
      // Trạng thái "đang mở cửa" thay đổi theo thời gian.
      setInterval(() => this.updateStatuses(), 60 * 1000);
    }

    /* ----------------------------- Trạng thái ----------------------------- */

    readStateFromURL() {
      const q = (name) => Utils.getQueryParam(name, '');
      const state = defaultState();

      state.keyword = q('keyword').trim().slice(0, 80);
      if (DataService.getCities().includes(q('city'))) state.city = q('city');
      if (Object.prototype.hasOwnProperty.call(AppData.STORE_SERVICES, q('service'))) state.service = q('service');
      state.openNow = q('open') === '1';
      const id = parseInt(q('id'), 10);
      if (DataService.getStoreById(id)) state.id = id;
      return state;
    }

    writeStateToURL() {
      const s = this.state;
      const first = this.visible[0];
      Utils.setQueryParams({
        keyword: s.keyword,
        city: s.city,
        service: s.service,
        open: s.openNow ? '1' : '',
        // Chỉ ghi id khi người dùng chọn khác cửa hàng đầu tiên.
        id: first && s.id !== first.id ? String(s.id) : '',
      });
    }

    getStores() {
      const { city, keyword, service, openNow } = this.state;
      let list = DataService.getStores({ city, keyword, service });
      if (openNow) {
        const now = new Date();
        list = list.filter((store) => store.isOpenNow(now));
      }
      return list;
    }

    /* ------------------------------ Bộ lọc ------------------------------ */

    renderOptions() {
      this.el.city.innerHTML =
        '<option value="">Tất cả thành phố</option>' +
        DataService.getCities()
          .map((city) => `<option value="${esc(city)}">${esc(city)} (${DataService.getStores({ city }).length})</option>`)
          .join('');

      this.el.service.innerHTML =
        '<option value="">Tất cả dịch vụ</option>' +
        Object.entries(AppData.STORE_SERVICES)
          .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
          .join('');
    }

    syncControls() {
      this.el.search.value = this.state.keyword;
      this.el.city.value = this.state.city;
      this.el.service.value = this.state.service;
      this.el.open.checked = this.state.openNow;
    }

    bindEvents() {
      const { form, search, city, service, open, list } = this.el;

      form.addEventListener('submit', (event) => event.preventDefault());
      search.addEventListener(
        'input',
        Utils.debounce(() => {
          this.state.keyword = search.value.trim();
          this.apply();
        }, 250)
      );
      city.addEventListener('change', () => {
        this.state.city = city.value;
        this.apply();
      });
      service.addEventListener('change', () => {
        this.state.service = service.value;
        this.apply();
      });
      open.addEventListener('change', () => {
        this.state.openNow = open.checked;
        this.apply();
      });

      document.addEventListener('click', (event) => {
        if (event.target.closest('[data-reset]')) this.reset();
      });

      list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-show-map]');
        if (button) this.select(Number(button.dataset.showMap), { scroll: true });
      });
    }

    reset() {
      this.state = defaultState();
      this.syncControls();
      this.apply();
    }

    /* ------------------------------ Hiển thị ------------------------------ */

    /** Tính lại danh sách theo bộ lọc, giữ cửa hàng đang chọn nếu còn trong kết quả. */
    apply() {
      this.visible = this.getStores();
      if (!this.visible.some((store) => store.id === this.state.id)) {
        this.state.id = this.visible.length ? this.visible[0].id : 0;
      }

      this.renderCount();
      Templates.renderInto(
        this.el.list,
        this.visible,
        (store) => this.cardHTML(store),
        `<li class="store-list__empty">
           ${Templates.emptyState('Không tìm thấy cửa hàng', 'Hãy thử đổi thành phố, dịch vụ hoặc từ khóa khác nhé.', '📍')}
           <button class="btn btn--primary" type="button" data-reset>Xóa bộ lọc</button>
         </li>`
      );
      this.renderMap();
      this.writeStateToURL();
    }

    renderCount() {
      const total = this.visible.length;
      const { city } = this.state;
      this.el.count.textContent = total ? `${total} cửa hàng${city ? ` tại ${city}` : ''}` : 'Không có cửa hàng phù hợp.';
    }

    /** Nhãn mở/đóng cửa theo giờ hiện tại. */
    statusInfo(store, now = new Date()) {
      const open = store.isOpenNow(now);
      return { open, text: open ? `Đang mở cửa · đến ${store.close}` : `Đã đóng cửa · mở lúc ${store.open}` };
    }

    cardHTML(store) {
      const selected = store.id === this.state.id;
      const status = this.statusInfo(store);

      return `
        <li>
          <article class="store-card${selected ? ' is-selected' : ''}" data-store-id="${store.id}" aria-labelledby="store-name-${store.id}">
            <div class="store-card__media">
              <img src="${esc(store.image)}" alt="" width="800" height="450" loading="lazy" decoding="async">
            </div>
            <div class="store-card__body">
              <div class="store-card__top">
                <h2 class="store-card__name" id="store-name-${store.id}">${esc(store.name)}</h2>
                <span class="store-status ${status.open ? 'is-open' : 'is-closed'}" data-status>${esc(status.text)}</span>
              </div>
              <p class="store-card__desc">${esc(store.description)}</p>
              <ul class="store-card__info">
                <li>${ICONS.pin}<span>${esc(store.address)}</span></li>
                <li>${ICONS.phone}<a href="tel:${esc(store.phone.replace(/\s/g, ''))}">${esc(store.phone)}</a></li>
                <li>${ICONS.clock}<span>${esc(store.hoursLabel)} hằng ngày</span></li>
              </ul>
              <ul class="store-card__services" aria-label="Dịch vụ">
                ${store.serviceLabels.map((label) => `<li class="tag">${esc(label)}</li>`).join('')}
              </ul>
              <div class="store-card__actions">
                <button class="btn btn--primary btn--sm" type="button" data-show-map="${store.id}" aria-pressed="${selected}">
                  ${selected ? 'Đang xem trên bản đồ' : 'Xem bản đồ'}
                </button>
                <a class="btn btn--outline btn--sm" href="${esc(store.mapUrl)}" target="_blank" rel="noopener noreferrer">
                  Chỉ đường<span class="sr-only"> (mở tab mới)</span>
                </a>
              </div>
            </div>
          </article>
        </li>`;
    }

    /** Cập nhật nhãn mở/đóng cửa của các thẻ đang hiển thị (không vẽ lại danh sách). */
    updateStatuses() {
      const now = new Date();
      $$('.store-card', this.el.list).forEach((card) => {
        const store = DataService.getStoreById(card.dataset.storeId);
        const badge = $('[data-status]', card);
        if (!store || !badge) return;
        const status = this.statusInfo(store, now);
        badge.textContent = status.text;
        badge.classList.toggle('is-open', status.open);
        badge.classList.toggle('is-closed', !status.open);
      });
    }

    /** Chọn cửa hàng để hiển thị trên bản đồ. */
    select(id, { scroll = false } = {}) {
      this.state.id = id;
      $$('.store-card', this.el.list).forEach((card) => {
        const selected = Number(card.dataset.storeId) === id;
        card.classList.toggle('is-selected', selected);
        const button = $('[data-show-map]', card);
        button.setAttribute('aria-pressed', String(selected));
        button.textContent = selected ? 'Đang xem trên bản đồ' : 'Xem bản đồ';
      });
      this.renderMap();
      this.writeStateToURL();

      // Trên mobile bản đồ nằm phía trên danh sách -> cuộn lên cho người dùng thấy.
      if (scroll && !this.desktop.matches) {
        this.el.map.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    }

    mapEmbedUrl(store) {
      const dLng = 0.006;
      const dLat = 0.004;
      const bbox = [store.lng - dLng, store.lat - dLat, store.lng + dLng, store.lat + dLat].map((n) => n.toFixed(5)).join('%2C');
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${store.lat}%2C${store.lng}`;
    }

    renderMap() {
      const store = DataService.getStoreById(this.state.id);
      this.el.map.hidden = !store;
      if (!store) return;

      const src = this.mapEmbedUrl(store);
      if (this.el.mapFrame.getAttribute('src') !== src) this.el.mapFrame.setAttribute('src', src);
      this.el.mapFrame.title = `Bản đồ vị trí ${store.name}`;

      this.el.mapInfo.innerHTML = `
        <h2 class="store-map__name">${esc(store.name)}</h2>
        <p>${esc(store.address)}</p>
        <a class="btn btn--outline btn--sm" href="${esc(store.mapUrl)}" target="_blank" rel="noopener noreferrer">Mở Google Maps<span class="sr-only"> (mở tab mới)</span></a>
        <p class="form-hint">Bản đồ &copy; đóng góp của OpenStreetMap</p>`;
      document.title = `${store.name} – Cửa hàng – ${SITE_NAME}`;
    }
  }

  if ($('#store-list')) new StoresPage().init();
})();
