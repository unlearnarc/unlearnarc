import axios from 'axios';

// Base URL resolution:
//  • Local dev  → defaults to http://127.0.0.1:8085/api/v1 (bypasses the corp
//    HTTP proxy that 503s `localhost`; must match the UI origin 127.0.0.1:3002).
//  • Cloud/Vercel → set VITE_API_URL to the Render backend origin, e.g.
//    VITE_API_URL=https://unlearnarc-backend.onrender.com
// We append /api/v1 ourselves so the env var stays a clean origin.
const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8085';
const BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ua_user_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // TEST-ONLY: contest routes are auth-less, so a 401 on a contest call must
    // NOT bounce the user to /login (that caused the Google-login → localhost
    // redirect loop). TODO: remove the isContest guard when auth is restored.
    const url = err.config?.url ?? '';
    const isContest = url.includes('/contests');
    if (err.response?.status === 401 && !isContest) {
      localStorage.removeItem('ua_user_token');
      localStorage.removeItem('ua_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
