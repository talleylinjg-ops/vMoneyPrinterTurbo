const API_BASE = "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.message) throw new Error(data.message);
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
};
