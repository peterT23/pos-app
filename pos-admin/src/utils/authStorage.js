const TOKEN_KEY = 'pos_auth_token';
const REFRESH_KEY = 'pos_auth_refresh';
const USER_KEY = 'pos_auth_user';
const STORE_KEY = 'pos_store_id';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function setStoredAuth(token, user, refreshToken) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (refreshToken !== undefined) {
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredStoreId() {
  return localStorage.getItem(STORE_KEY);
}

export function setStoredStoreId(storeId) {
  if (storeId) {
    localStorage.setItem(STORE_KEY, storeId);
  } else {
    localStorage.removeItem(STORE_KEY);
  }
}

export function authStorageKeys() {
  return { TOKEN_KEY, REFRESH_KEY, USER_KEY, STORE_KEY };
}
