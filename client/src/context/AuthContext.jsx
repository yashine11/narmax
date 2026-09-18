import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('narmax_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/api/user/me')
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('narmax_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('narmax_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('narmax_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const loginWithToken = async (token) => {
    localStorage.setItem('narmax_token', token);
    const { data } = await api.get('/api/user/me');
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('narmax_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/api/user/me');
    setUser(data);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithToken, logout, refreshUser, setUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
