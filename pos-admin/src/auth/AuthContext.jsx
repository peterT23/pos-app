import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStorageKeys, clearStoredAuth, getStoredToken, getStoredUser, setStoredAuth } from '../utils/authStorage';
import { refreshSession } from '../utils/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  const login = useCallback((nextToken, nextUser, nextRefreshToken) => {
    setStoredAuth(nextToken, nextUser, nextRefreshToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        headers: { 'X-Client-App': 'pos-admin' },
        credentials: 'include',
      });
    } catch (err) {
      // ignore
    }
  }, []);

  const checkSession = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    try {
      const data = await refreshSession();
      if (data?.token) {
        setToken(data.token);
        setUser(data.user || getStoredUser());
        return;
      }
      if (token) {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      }
    } catch {
      // Backend không phản hồi (ví dụ chưa chạy), bỏ qua
    }
  }, [token]);

  useEffect(() => {
    const { TOKEN_KEY, REFRESH_KEY, USER_KEY } = authStorageKeys();
    const handler = (event) => {
      if (event.key !== TOKEN_KEY && event.key !== REFRESH_KEY && event.key !== USER_KEY) return;
      setToken(getStoredToken());
      setUser(getStoredUser());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        if (!token) {
          const data = await refreshSession();
          if (active && data?.token) {
            setToken(data.token);
            setUser(data.user || getStoredUser());
          }
        } else {
          await checkSession();
        }
      } catch {
        // Backend không phản hồi, bỏ qua
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const intervalId = setInterval(checkSession, 60 * 1000);
    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkSession]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token),
    isLoading: loading,
    login,
    logout,
  }), [token, user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
