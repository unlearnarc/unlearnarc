import axios from 'axios';

// Base URL resolution:
//  • Local dev  → defaults to a RELATIVE "/api/v1". The app is served on
//    http://localhost:3002 and Vite proxies /api + /oauth2 to the backend
//    (127.0.0.1:8085). Using a relative base keeps every request same-origin
//    with the page, so there is no CORS surface and the OAuth-minted JWT in
//    localStorage (origin-scoped) is always sent back to the right host.
//  • Cloud/Vercel → set VITE_API_URL to the Render backend origin, e.g.
//    VITE_API_URL=https://unlearnarc-backend.onrender.com (we append /api/v1).
const API_ORIGIN = import.meta.env.VITE_API_URL ?? '';
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
    // Expired sessions must leave protected pages, including contests.
    if (err.response?.status === 401 && localStorage.getItem('ua_user_token')) {
      localStorage.removeItem('ua_user_token');
      localStorage.removeItem('ua_user_refresh');
      localStorage.removeItem('ua_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
