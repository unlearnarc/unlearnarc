import axios from 'axios';

// Local dev defaults to the local backend; on Vercel set VITE_API_URL to the
// Render backend origin, e.g. https://unlearnarc-backend.onrender.com
const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:8085';
const BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach token on every request ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ua_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-logout on 401 ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ua_token');
      localStorage.removeItem('ua_admin');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
