const API_BASE = "/api";

async function request(path, { method = "GET", body, token, apiKey } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.detail || `请求失败 (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/user/me", { token }),
  rotateKey: (token) => request("/user/rotate-key", { method: "POST", token }),
  plans: () => request("/plans"),
  createOrder: (token, payload) => request("/orders", { method: "POST", body: payload, token }),
  payOrder: (token, id) => request(`/orders/${id}/pay`, { method: "POST", token }),
  myOrders: (token) => request("/user/orders", { token }),
  myUsage: (token) => request("/user/usage", { token }),
  updateProfile: (token, payload) => request("/user/profile", { method: "PUT", body: payload, token }),
  updatePassword: (token, payload) => request("/user/password", { method: "PUT", body: payload, token }),
  createVideo: (apiKey, payload) =>
    request("/proxy/v1/videos", { method: "POST", body: payload, apiKey }),
  videoStatus: (apiKey, taskId) => request(`/proxy/v1/videos/${taskId}`, { apiKey }),
  videoPreviewUrl: (apiKey, taskId) =>
    `${API_BASE}/proxy/v1/videos/${taskId}/preview?api_key=${encodeURIComponent(apiKey)}`,
  videoDownloadUrl: (apiKey, taskId) =>
    `${API_BASE}/proxy/v1/videos/${taskId}/download?api_key=${encodeURIComponent(apiKey)}`,
};
