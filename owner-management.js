(() => {
  const collections = {
    products: [],
    categories: [],
    news: [],
    stores: [],
    staff: [],
  };
  const endpoints = {
    products: "/products",
    categories: "/categories",
    news: "/news",
    stores: "/stores",
    staff: "/users/staff",
  };
  const entityCollections = {
    product: "products",
    category: "categories",
    news: "news",
    store: "stores",
    staff: "staff",
  };

  function field(label, name, value = "", type = "text", attrs = "", full = false) {
    return `<label class="owner-field${full ? " full" : ""}"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${attrs}></label>`;
  }

  function textarea(label, name, value = "") {
    return `<label class="owner-field full"><span>${label}</span><textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
  }

  function selectField(label, name, options, currentValue) {
    return `<label class="owner-field"><span>${label}</span><select name="${name}" required>${options
      .map(
        (option) =>
          `<option value="${escapeHtml(option.value)}"${String(option.value) === String(currentValue) ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
      )
      .join("")}</select></label>`;
  }

  function showEditor(entity, item) {
    const form = document.getElementById("owner-entity-form");
    const title = document.getElementById("owner-modal-title");
    const fields = document.getElementById("owner-form-fields");
    const edit = Boolean(item);
    form.dataset.entity = entity;
    form.dataset.id = item?.id || "";
    const heading = `${edit ? "Sửa" : "Thêm"} ${
      { staff: "nhân viên", product: "sản phẩm", category: "danh mục", news: "tin tức", store: "vị trí quầy bánh" }[entity]
    }`;
    title.textContent = heading;

    if (entity === "staff") {
      fields.innerHTML = `<div class="owner-fields">${field("Họ tên","full_name","","text","required maxlength=100")}${field("Email","email","","email","required")}${field("Mật khẩu (8 ký tự, hoa/thường/số)","password","","password","required minlength=8")}</div>`;
    } else if (entity === "product") {
      const categories = collections.categories.map((category) => ({
        value: category.id,
        label: category.name,
      }));
      fields.innerHTML = `<div class="owner-fields">
        ${field("Tên sản phẩm", "name", item?.name || "", "text", "required maxlength=120")}
        ${selectField("Danh mục", "category_id", categories, item?.category_id)}
        ${field("Giá bán (đ)", "price", item?.price ?? "", "number", "required min=1 step=1")}
        ${field("Giá cũ (đ)", "old_price", item?.old_price ?? 0, "number", "min=0 step=1")}
        ${field("Đánh giá", "rating", item?.rating ?? 5, "number", "min=0 max=5 step=0.1")}
        <p>Tồn kho thay đổi bằng nút Nhập / Xuất sau khi lưu sản phẩm.</p>
        ${field("Đường dẫn ảnh", "image", item?.image || "", "text", "", true)}
        ${textarea("Mô tả", "description", item?.description || "")}
      </div>`;
    } else if (entity === "category") {
      fields.innerHTML = `<div class="owner-fields">
        ${field("Tên danh mục", "name", item?.name || "", "text", "required maxlength=100", true)}
        ${textarea("Mô tả", "description", item?.description || "")}
      </div>`;
    } else if (entity === "news") {
      fields.innerHTML = `<div class="owner-fields">
        ${field("Tiêu đề", "title", item?.title || "", "text", "required maxlength=200", true)}
        ${field("Ngày (dd/mm/yyyy)", "date", item?.date || "", "text", "required")}
        ${field("Danh mục", "category", item?.category || "", "text", "required")}
        ${field("Đường dẫn ảnh", "image", item?.image || "", "text", "", true)}
        ${textarea("Nội dung", "description", item?.description || "")}
      </div>`;
    } else if (entity === "store") {
      fields.innerHTML = `<div class="owner-fields">
        ${field("Địa chỉ quầy bánh", "address", item?.address || "Hẻm 1, ngách 22/18, làng Lụa Vạn Phúc", "text", "required maxlength=250", true)}
        ${field("Giờ mở cửa", "opening_time", item?.opening_time || "08:00 - 21:30", "text", "required", true)}
      </div>`;
    }

    document.getElementById("owner-modal").showModal();
  }

  function actionButtons(entity, id) {
    if (entity === "product") return `<div class="management-actions"><button class="mini-btn" data-edit="product" data-id="${id}">Sửa</button><button class="mini-btn" data-stock="IN" data-id="${id}">Nhập</button><button class="mini-btn" data-stock="OUT" data-id="${id}">Xuất</button></div>`;
    return `<div class="management-actions"><button class="mini-btn" type="button" data-edit="${entity}" data-id="${id}">Sửa</button><button class="mini-btn" type="button" data-delete="${entity}" data-id="${id}">Xóa</button></div>`;
  }

  function renderProducts() {
    const body = document.getElementById("owner-products");
    body.innerHTML = collections.products.length
      ? collections.products
          .map(
            (item) =>
              `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.category)}</td><td>${formatVND(item.price)}</td><td>${escapeHtml(item.status)} (${item.stock})</td><td>${actionButtons("product", item.id)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="management-empty">Chưa có sản phẩm.</td></tr>';
  }

  async function adjustStock(id, mode) {
    const input = prompt(mode === "IN" ? "Số bánh nhập thêm:" : "Số bánh hỏng/bỏ cần xuất:");
    if (input === null) return;
    const quantity = Number(input);
    if (!Number.isSafeInteger(quantity) || quantity < 1) { showToast("Nhập số nguyên dương."); return; }
    try { await api.post(`/products/${id}/stock`, {quantity, mode}); await reloadAll(); showToast("Đã cập nhật tồn kho."); } catch(e) { showToast(e.message); }
  }
  function renderCategories() {
    const body = document.getElementById("owner-categories");
    body.innerHTML = collections.categories.length
      ? collections.categories
          .map(
            (item) =>
              `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.description)}</td><td>${actionButtons("category", item.id)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3" class="management-empty">Chưa có danh mục.</td></tr>';
  }

  function renderNews() {
    const body = document.getElementById("owner-news");
    body.innerHTML = collections.news.length
      ? collections.news
          .map(
            (item) =>
              `<tr><td><b>${escapeHtml(item.title)}</b></td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.date)}</td><td>${actionButtons("news", item.id)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" class="management-empty">Chưa có tin tức.</td></tr>';
  }

  function renderStore() {
    const container = document.getElementById("owner-store");
    const store = collections.stores[0];
    container.innerHTML = store
      ? `<div class="management-store"><div><b>${escapeHtml(store.name)}</b><p>${escapeHtml(store.address)}</p><p>Giờ mở cửa: ${escapeHtml(store.opening_time)}</p></div><button class="action-btn" type="button" data-edit="store" data-id="${store.id}">Sửa vị trí</button></div>`
      : '<div class="management-store"><p>Chưa có vị trí quầy bánh.</p><button class="action-btn" type="button" data-add="store">Thêm vị trí</button></div>';
  }

  function renderStaff() {
    const body = document.getElementById("owner-staff");
    body.innerHTML = collections.staff.length
      ? collections.staff
          .map(
            (item) =>
              `<tr><td><b>${escapeHtml(item.full_name)}</b></td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.phone || "-")}</td><td><button class="mini-btn" type="button" data-delete="staff" data-id="${item.id}">Vô hiệu hóa</button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" class="management-empty">Không có tài khoản nhân viên đang hoạt động.</td></tr>';
  }

  function renderError(key, error) {
    const element = document.getElementById(
      {
        products: "owner-products",
        categories: "owner-categories",
        news: "owner-news",
        stores: "owner-store",
        staff: "owner-staff",
      }[key],
    );
    if (element) {
      element.innerHTML = `<tr><td colspan="5" class="management-empty">${escapeHtml(error.message)}</td></tr>`;
      if (key === "stores")
        element.textContent = `Không tải được dữ liệu: ${error.message}`;
    }
  }

  async function loadCollection(key) {
    try {
      collections[key] = (await api.get(endpoints[key])).data;
      return true;
    } catch (error) {
      renderError(key, error);
      return false;
    }
  }

  async function reloadAll() {
    const categoriesLoaded = await loadCollection("categories");
    if (categoriesLoaded) renderCategories();
    const loaded = await Promise.all(
      ["products", "news", "stores", "staff"].map(loadCollection),
    );
    if (loaded[0]) renderProducts();
    if (loaded[1]) renderNews();
    if (loaded[2]) renderStore();
    if (loaded[3]) renderStaff();
  }

  function getPayload(form, entity) {
    const values = Object.fromEntries(new FormData(form));
    if (entity === "product") {
      return {
        ...values,
        category_id: Number(values.category_id),
        price: Number(values.price),
        old_price: Number(values.old_price || 0),
        rating: Number(values.rating || 0),
      };
    }
    if (entity === "store")
      return {
        name: "Vị trí quầy bánh",
        address: values.address.trim(),
        distance: "",
        opening_time: values.opening_time.trim(),
      };
    return values;
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const entity = form.dataset.entity;
    const id = form.dataset.id;
    const key = entityCollections[entity];
    const endpoint = endpoints[key];
    const payload = getPayload(form, entity);
    try {
      if (id) await api.put(`${endpoint}/${id}`, payload);
      else await api.post(endpoint, payload);
      document.getElementById("owner-modal").close();
      await reloadAll();
      showToast(id ? "Đã cập nhật thành công." : "Đã thêm thành công.");
    } catch (error) {
      showToast(error.message);
    }
  }

  async function deleteItem(entity, id) {
    const confirmations = {
      product: "Bạn có chắc muốn xóa sản phẩm này? Sản phẩm có lịch sử đơn hàng sẽ được bảo vệ.",
      category: "Bạn có chắc muốn xóa danh mục này? Danh mục đang có sản phẩm sẽ không thể xóa.",
      news: "Bạn có chắc muốn xóa tin tức này?",
      staff: "Vô hiệu hóa tài khoản sẽ chặn đăng nhập nhưng giữ nguyên lịch sử đơn hàng. Tiếp tục?",
    };
    if (!window.confirm(confirmations[entity])) return;
    try {
      const endpoint = entity === "staff" ? "/users" : endpoints[entityCollections[entity]];
      await api.delete(`${endpoint}/${id}`);
      await reloadAll();
      showToast(entity === "staff" ? "Đã vô hiệu hóa tài khoản nhân viên." : "Đã xóa thành công.");
    } catch (error) {
      showToast(error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!requireRole("ADMIN")) return;
    document
      .getElementById("owner-entity-form")
      .addEventListener("submit", submitForm);
    document.addEventListener("click", (event) => {
      const target = event.target;
      const stock = target.closest("[data-stock]");
      if (stock) { adjustStock(stock.dataset.id, stock.dataset.stock); return; }
      if (target.closest("[data-close]")) {
        document.getElementById("owner-modal").close();
        return;
      }
      const add = target.closest("[data-add]");
      if (add) {
        showEditor(add.dataset.add);
        return;
      }
      const edit = target.closest("[data-edit]");
      if (edit) {
        const key = entityCollections[edit.dataset.edit];
        const item = collections[key].find((entry) => String(entry.id) === edit.dataset.id);
        if (item) showEditor(edit.dataset.edit, item);
        return;
      }
      const remove = target.closest("[data-delete]");
      if (remove) deleteItem(remove.dataset.delete, remove.dataset.id);
    });
    await reloadAll();
  });
})();
