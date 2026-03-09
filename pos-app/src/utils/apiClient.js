import { getStoredStoreId, getStoredToken, getStoredUser, setStoredAuth, setStoredToken } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_STORE_ID = import.meta.env.VITE_DEFAULT_STORE_ID || 'default';
const CLIENT_APP = 'pos-app';

export async function apiRequest(path, options = {}, retry = true) {
  const token = getStoredToken();
  const storeId = getStoredStoreId() || DEFAULT_STORE_ID;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (storeId) {
    headers['X-Store-Id'] = storeId;
  }
  headers['X-Client-App'] = CLIENT_APP;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && retry && path !== '/api/auth/refresh') {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-App': CLIENT_APP,
          },
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok && refreshData.token) {
          setStoredToken(refreshData.token);
          const user = refreshData.user || getStoredUser();
          setStoredAuth(refreshData.token, user);
          return apiRequest(path, options, false);
        }
      } catch {
        // Backend không chạy hoặc lỗi mạng
      }
    }
    const message = data.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    if (data && data.errors) {
      error.errors = data.errors;
    }
    throw error;
  }

  return data;
}

/** Gọi refresh session. Trả về null khi lỗi mạng hoặc backend không chạy (không ném lỗi). */
export async function refreshSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-App': CLIENT_APP },
      credentials: 'include',
    });
    if (response.status === 204) {
      return null;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return null;
    }
    if (data.token) {
      setStoredToken(data.token);
      const user = data.user || getStoredUser();
      setStoredAuth(data.token, user);
    }
    return data;
  } catch {
    return null;
  }
}
