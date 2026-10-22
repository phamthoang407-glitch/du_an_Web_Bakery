/**
 * news.js – Logic trang Tin tức (pages/news.html)
 *  - Danh sách: lọc chủ đề (tabs), tìm kiếm, bài nổi bật, phân trang. URL: ?topic=&keyword=&page=
 *  - Chi tiết:  ?id=<id bài viết> (nội dung, chia sẻ/copy link, bài liên quan, trước/sau).
 * Phụ thuộc: js/data.js, js/main.js
 */
(function () {
  'use strict';

  const { DataService, AppData, App } = window;
  const { Utils, Templates, Toast, Paths } = App;
  const esc = Utils.escapeHTML;
  const $ = (s, c) => Utils.$(s, c);
  const PER_PAGE = 6;

  class NewsPage {
    constructor() {
      this.el = {
        listView: $('#news-list-view'),
        detailView: $('#news-detail-view'),
        topics: $('#news-topics'),
        form: $('#news-search-form'),
        search: $('#news-search'),
        count: $('#news-count'),
        featured: $('#news-featured'),
        grid: $('#news-grid'),
        pagination: $('#news-pagination'),
        hero: $('#news-hero'),
        breadcrumb: $('#news-breadcrumb'),
      };
    }

    init() {
      const id = parseInt(Utils.getQueryParam('id', ''), 10);
      if (id) return this.showDetail(id);
      this.initList();
    }

    /* ============================ DANH SÁCH ============================ */

    initList() {
      const topicIds = AppData.NEWS_CATEGORIES.map((c) => c.id);
      const topic = Utils.getQueryParam('topic', '');
      this.state = {
        topic: topicIds.includes(topic) ? topic : '',
        keyword: Utils.getQueryParam('keyword', '').trim().slice(0, 80),
        page: parseInt(Utils.getQueryParam('page', '1'), 10) || 1,
      };
      this.el.search.value = this.state.keyword;
      this.renderTopics();

      this.el.form.addEventListener('submit', (e) => e.preventDefault());
      this.el.search.addEventListener(
        'input',
        Utils.debounce(() => {
          this.state.keyword = this.el.search.value.trim();
          this.state.page = 1;
          this.renderList();
        }, 250)
      );
      this.el.topics.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-topic]');
        if (!btn) return;
        this.state.topic = btn.dataset.topic;
        this.state.page = 1;
        this.renderTopics();
        this.renderList();
      });
      this.el.pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        this.state.page = Number(btn.dataset.page);
        this.renderList();
        this.el.listView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-reset]')) {
          this.state = { topic: '', keyword: '', page: 1 };
          this.el.search.value = '';
          this.renderTopics();
          this.renderList();
        }
      });
      this.renderList();
    }

    renderTopics() {
      const all = [{ id: '', name: 'Tất cả' }, ...AppData.NEWS_CATEGORIES];
      this.el.topics.innerHTML = all
        .map(
          (c) =>
            `<button type="button" class="tabs__tab${c.id === this.state.topic ? ' is-active' : ''}" data-topic="${esc(c.id)}" aria-pressed="${c.id === this.state.topic}">${esc(c.name)}</button>`
        )
        .join('');
    }

    renderList() {
      const { topic, keyword } = this.state;
      const all = DataService.getArticles({ category: topic, keyword });
      // Bài nổi bật chỉ hiện ở trang 1 khi không tìm kiếm / lọc.
      const showFeatured = !topic && !keyword && this.state.page === 1 && all.length > PER_PAGE - 2;
      const featured = showFeatured ? all.find((a) => a.featured) : null;
      const rest = featured ? all.filter((a) => a.id !== featured.id) : all;
      const pg = DataService.paginate(rest, this.state.page, PER_PAGE);
      this.state.page = pg.page;

      this.el.count.textContent = all.length ? `${all.length} bài viết` : 'Không có bài viết phù hợp.';
      this.el.featured.innerHTML = featured ? this.featuredHTML(featured) : '';
      Templates.renderInto(
        this.el.grid,
        pg.items,
        (a) => Templates.articleCard(a),
        all.length
          ? ''
          : `<div class="news-empty">${Templates.emptyState('Chưa có bài viết', 'Thử chọn chủ đề khác hoặc đổi từ khóa nhé.', '📰')}<button class="btn btn--primary" type="button" data-reset>Xóa bộ lọc</button></div>`
      );
      this.renderPagination(pg);
      Utils.setQueryParams({ topic, keyword, page: pg.page > 1 ? String(pg.page) : '' });
    }

    featuredHTML(a) {
      const url = Paths.article(a.id);
      return `
        <article class="news-featured">
          <a class="news-featured__media" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(a.image)}" alt="" width="800" height="450" /></a>
          <div class="news-featured__body">
            <span class="badge badge--hot">Nổi bật</span>
            <div class="article-card__meta"><span class="tag">${esc(a.categoryName)}</span><time datetime="${esc(a.date)}">${Utils.formatDate(a.date)}</time><span>· ${a.readMinutes} phút đọc</span></div>
            <h2 class="news-featured__title"><a href="${url}">${esc(a.title)}</a></h2>
            <p>${esc(a.excerpt)}</p>
            <a class="btn btn--primary" href="${url}">Đọc bài viết</a>
          </div>
        </article>`;
    }

    renderPagination(pg) {
      if (pg.totalPages <= 1) {
        this.el.pagination.innerHTML = '';
        return;
      }
      const btn = (label, page, { disabled = false, current = false, aria = '' } = {}) =>
        `<button type="button" class="pagination__btn${current ? ' is-active' : ''}" data-page="${page}" ${disabled ? 'disabled' : ''} ${current ? 'aria-current="page"' : ''} ${aria ? `aria-label="${aria}"` : ''}>${label}</button>`;
      let html = btn('‹', pg.page - 1, { disabled: pg.page === 1, aria: 'Trang trước' });
      for (let i = 1; i <= pg.totalPages; i++) html += btn(i, i, { current: i === pg.page, aria: `Trang ${i}` });
      html += btn('›', pg.page + 1, { disabled: pg.page === pg.totalPages, aria: 'Trang sau' });
      this.el.pagination.innerHTML = html;
    }

    /* ============================= CHI TIẾT ============================= */

    showDetail(id) {
      const article = DataService.getArticleById(id);
      this.el.listView.hidden = true;
      this.el.detailView.hidden = false;
      this.el.hero.hidden = true;

      if (!article) {
        document.title = `Không tìm thấy bài viết – ${AppData.SITE.name}`;
        this.el.breadcrumb.innerHTML = `<li><a href="../index.html">Trang chủ</a></li><li><a href="news.html">Tin tức</a></li><li><span aria-current="page">Không tìm thấy</span></li>`;
        this.el.detailView.innerHTML = `${Templates.emptyState('Không tìm thấy bài viết', 'Bài viết có thể đã bị xóa hoặc đường dẫn không đúng.', '📰')}<p class="text-center"><a class="btn btn--primary" href="news.html">Về trang tin tức</a></p>`;
        return;
      }

      document.title = `${article.title} – ${AppData.SITE.name}`;
      this.el.breadcrumb.innerHTML = `
        <li><a href="../index.html">Trang chủ</a></li>
        <li><a href="news.html">Tin tức</a></li>
        <li><a href="news.html?topic=${esc(article.category)}">${esc(article.categoryName)}</a></li>
        <li><span aria-current="page">${esc(Utils.truncate(article.title, 40))}</span></li>`;

      const sorted = DataService.getArticles();
      const idx = sorted.findIndex((a) => a.id === article.id);
      const prev = sorted[idx + 1];
      const next = sorted[idx - 1];
      const related = sorted.filter((a) => a.id !== article.id).sort((a, b) => (b.category === article.category) - (a.category === article.category)).slice(0, 3);

      this.el.detailView.innerHTML = `
        <article class="post">
          <header class="post__header">
            <span class="tag">${esc(article.categoryName)}</span>
            <h1 class="post__title">${esc(article.title)}</h1>
            <p class="post__meta">${esc(article.author)} · <time datetime="${esc(article.date)}">${Utils.formatDate(article.date)}</time> · ${article.readMinutes} phút đọc</p>
          </header>
          <img class="post__cover" src="${esc(article.image)}" alt="" width="1200" height="630" />
          <p class="post__lead">${esc(article.excerpt)}</p>
          <div class="post__content">${article.content.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <ul class="post__tags" aria-label="Thẻ">${article.tags.map((t) => `<li class="tag">#${esc(t)}</li>`).join('')}</ul>
          <div class="post__share">
            <span>Chia sẻ bài viết:</span>
            <button class="btn btn--outline btn--sm" type="button" data-copy-link>Sao chép liên kết</button>
            <a class="btn btn--outline btn--sm" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}">Facebook<span class="sr-only"> (mở tab mới)</span></a>
          </div>
          <nav class="post__nav" aria-label="Bài viết khác">
            ${prev ? `<a href="${Paths.article(prev.id)}"><small>← Bài cũ hơn</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
            ${next ? `<a class="is-next" href="${Paths.article(next.id)}"><small>Bài mới hơn →</small><span>${esc(next.title)}</span></a>` : '<span></span>'}
          </nav>
        </article>
        <section class="news-related" aria-labelledby="related-title">
          <h2 id="related-title">Có thể bạn quan tâm</h2>
          <div class="grid grid--3">${related.map((a) => Templates.articleCard(a)).join('')}</div>
        </section>`;

      $('[data-copy-link]', this.el.detailView).addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          Toast.show('Đã sao chép liên kết bài viết', 'success');
        } catch (err) {
          Toast.show('Không thể sao chép, hãy copy từ thanh địa chỉ.', 'error');
        }
      });
    }
  }

  if ($('#news-list-view')) new NewsPage().init();
})();
