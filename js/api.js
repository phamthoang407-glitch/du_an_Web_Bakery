const API_BASE_URL = window.BAKERY_API_BASE_URL || "http://localhost:3000/api";

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem("bakery_token");
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(API_BASE_URL + path, {
      ...options,
      headers,
      signal: controller.signal
    });
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }

    if (!response.ok || body.success === false) {
      const error = new Error(body.message || `HTTP ${response.status}`);
      error.status = response.status;
      if (response.status === 401) {
        localStorage.removeItem("bakery_token");
        localStorage.removeItem("bakery_user");
        localStorage.removeItem("bakery_role");
      }
      throw error;
    }
    return body;
  } catch (error) {
    if (error.name === "AbortError") {
      const e = new Error("Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.");
      e.code = "TIMEOUT";
      throw e;
    }
    if (error instanceof TypeError) {
      const e = new Error("Không thể kết nối đến máy chủ.");
      e.code = "NETWORK";
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const api = {
  get: path => apiRequest(path),
  post: (path, data) => apiRequest(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => apiRequest(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: path => apiRequest(path, { method: "DELETE" })
};

function saveAuth(data) {
  localStorage.setItem("bakery_token", data.token);
  localStorage.setItem("bakery_user", JSON.stringify(data.user));
  localStorage.setItem("bakery_role", data.user.role);
}
function clearAuth() {
  localStorage.removeItem("bakery_token");
  localStorage.removeItem("bakery_user");
  localStorage.removeItem("bakery_role");
}
function currentUser() {
  try { return JSON.parse(localStorage.getItem("bakery_user") || "null"); } catch { return null; }
}
function requireRole(...roles) {
  const user=currentUser();
  if(!user || !roles.includes(user.role)){
    showToast("Bạn không có quyền truy cập trang này.");
    setTimeout(()=>location.href=`${window.BASE || "../"}index.html`,700);
    return false;
  }
  return true;
}
function requireAuth() {
  if (!localStorage.getItem("bakery_token")) {
    location.href = `${window.BASE || "../"}pages/login.html`;
    return false;
  }
  return true;
}
window.API_BASE_URL = API_BASE_URL;
window.api = api;
window.saveAuth = saveAuth;
window.clearAuth = clearAuth;
window.currentUser = currentUser;
window.requireAuth = requireAuth;
window.requireRole = requireRole;
