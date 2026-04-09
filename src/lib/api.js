import axios from 'axios';

// Use proxy in development, direct URL in production
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5 minutes to support massive AI report generation
  headers: {
    'Content-Type': 'application/json',
  }
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export default api;