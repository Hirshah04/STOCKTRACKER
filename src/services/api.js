// Base API Client
const API_BASE = "";

let dbStatusListener = null;

export function setDbStatusListener(fn) {
  dbStatusListener = fn;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("stocktaker_token");

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(API_BASE + endpoint, config);
    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = { success: response.ok, message: response.statusText };
    }

    if (result && result.dbMode && dbStatusListener) {
      dbStatusListener(result.dbMode);
    }

    if (response.status === 401) {
      localStorage.removeItem("stocktaker_token");
      localStorage.removeItem("stocktaker_session");
      const isRevoked = result?.code === "SESSION_REVOKED" || (result?.message && result.message.toLowerCase().includes("another device"));
      const reason = isRevoked 
        ? "Your account was logged in on another device." 
        : (result?.message || "Session expired. Please sign in again.");
      sessionStorage.setItem("stocktaker_auth_notice", reason);
      window.dispatchEvent(new CustomEvent("stocktaker_auth_expired", { detail: { reason, isRevoked } }));
      throw new Error(reason);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`API Error on [${endpoint}]:`, error);
    throw error;
  }
}

export default apiRequest;
