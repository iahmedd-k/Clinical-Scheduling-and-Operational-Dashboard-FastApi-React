const API_URL = import.meta.env.VITE_API_URL || "";

const V1_PREFIXES = [
  "/departments",
  "/providers",
  "/services",
  "/slots",
  "/patients",
  "/appointments",
  "/analytics",
  "/reports",
  "/tasks",
  "/public",
];

function toApiPath(path) {
  const [pathname, search = ""] = path.split("?");
  const needsV1 = V1_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return needsV1 ? `/api/v1${pathname}${search ? `?${search}` : ""}` : path;
}

export async function request(path, options = {}) {
  const apiPath = toApiPath(path);
  const response = await fetch(`${API_URL}${apiPath}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (response.status === 503 && apiPath === "/health/ready") {
    return data?.status ? data : { status: "not_ready", checks: {}, detail: "The API is running, but one or more dependencies are not ready yet." };
  }
  if (!response.ok) {
    const detail = Array.isArray(data?.detail)
      ? data.detail.map((item) => item.msg || item.message || JSON.stringify(item)).join("; ")
      : data?.detail || data?.error?.message || `Request failed (${response.status})`;
    const error = new Error(detail);
    error.status = response.status;
    error.code = data?.code || data?.error?.code;
    error.payload = data;
    throw error;
  }
  return data;
}

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  return request("/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
}

export async function register(payload) {
  return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function createClient(token) {
  return (path, options = {}) => request(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
}

export { API_URL };
