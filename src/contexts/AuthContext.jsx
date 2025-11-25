import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../lib/api';

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('auth');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  // On app load, verify token and sync user
  useEffect(() => {
    setAuthToken(token);
    if (token && !user) {
      // Fetch current user info from /auth/me to ensure student is linked
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('auth', JSON.stringify(res.data));
        })
        .catch(err => {
          console.error('Failed to fetch user profile', err);
          // Token might be expired, clear it
          logout();
        });
    }
  }, [token]);

  async function register({ name, email, password, level, subject, style, goal }) {
    setLoading(true);
    const res = await api.post('/auth/register', { name, email, password, level, subject, style, goal });
    const { token: tkn, user: u } = res.data;
    setToken(tkn);
    setUser(u);
    localStorage.setItem('token', tkn);
    localStorage.setItem('auth', JSON.stringify(u));
    setAuthToken(tkn);
    setLoading(false);
    return u;
  }

  async function login({ email, password }) {
    setLoading(true);
    const res = await api.post('/auth/login', { email, password });
    const { token: tkn, user: u } = res.data;
    setToken(tkn);
    setUser(u);
    localStorage.setItem('token', tkn);
    localStorage.setItem('auth', JSON.stringify(u));
    setAuthToken(tkn);
    setLoading(false);
    return u;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('auth');
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}