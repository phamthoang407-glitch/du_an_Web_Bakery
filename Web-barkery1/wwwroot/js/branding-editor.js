(() => {
  const columns = { HeroImage: 'hero', LogoImage: 'logo', StoreImage: 'store' };
  const names = ['ShopName', 'Tagline', 'Title', 'Highlight', 'Description'];
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('branding-form');
    if (!form) return;
    const status = document.getElementById('branding-status');
    const submit = form.querySelector('[type=submit]');
    function preview(which, url) {
      const element = document.getElementById(`branding-${which}-preview`);
      if (element) { if (url) { element.src = url; element.style.display = ''; } else { element.removeAttribute('src'); element.style.display = 'none'; } }
    }
    try {
      const d = await window.fetchSiteBranding(true);
      names.forEach(key => { form.elements.namedItem(key).value = d[key] || ''; });
      Object.entries(columns).forEach(([key, field]) => preview(field, d[key]));
      status.textContent = 'Bạn có thể chỉnh sửa thông tin và chọn ảnh từ máy tính.';
    } catch (e) { status.textContent = e.message; }
    const chosenUrls = new Map();
    const imageKeys = ['HeroImage', 'LogoImage', 'StoreImage'];
    function showStatus(message, error = false) {
      status.textContent = message;
      status.style.color = error ? '#b42318' : '#276749';
    }

    for (const [filename, field] of [['heroFile','hero'],['logoFile','logo'],['storeFile','store']]) {
      form.elements.namedItem(filename).addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
          event.target.value = '';
          showStatus('Ảnh chỉ được là JPG, PNG, WebP và không vượt quá 4MB.', true);
          return;
        }
        if (chosenUrls.has(field)) URL.revokeObjectURL(chosenUrls.get(field));
        const url = URL.createObjectURL(file);
        chosenUrls.set(field, url);
        preview(field, url);
      });
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      submit.disabled = true;
      status.textContent = 'Đang tải ảnh và lưu dữ liệu trên máy chủ...';
      try {
        const response = await fetch('/api/site-branding', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' },
          body: data
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          const reason = response.status === 403 ? 'Không đủ quyền lưu. Hãy đăng nhập lại bằng tài khoản Chủ quầy.'
                       : response.status === 400 ? 'Yêu cầu không hợp lệ. Hãy tải lại trang và chọn ảnh lần nữa.'
                       : response.status === 413 ? 'Ảnh vượt quá giới hạn cho phép.'
                       : result.message || `Máy chủ trả về lỗi ${response.status}.`;
          throw new Error(reason);
        }
        const check = await window.fetchSiteBranding(true);
        const saved = result.data || {};
        const savedValue = key => Object.prototype.hasOwnProperty.call(saved, key)
          ? saved[key] : saved[key.charAt(0).toLowerCase() + key.slice(1)];
        if (!check || [...imageKeys, ...names].some(k => check[k] !== savedValue(k))) {
          throw new Error('Dữ liệu đọc lại chưa khớp. Hãy kiểm tra API /api/site-branding và nhật ký máy chủ.');
        }
        await window.applySiteBranding(true);
        for (const field of ['heroFile','logoFile','storeFile']) form.elements.namedItem(field).value = '';
        Object.entries(columns).forEach(([key, field]) => preview(field, savedValue(key)));
        showStatus('✓ Đã lưu và kiểm tra lại thành công trên máy chủ. Nhấn Xem trang chủ để kiểm tra ảnh mới.');
      } catch (error) { showStatus(`Không thể lưu: ${error.message}`, true); }
      finally { submit.disabled = false; }
    });
    window.addEventListener('beforeunload', () => chosenUrls.forEach(url => URL.revokeObjectURL(url)));
  });
})();
