import axios from 'axios';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1',
  withCredentials: true,
  timeout: 15000,
});

export const API_BASE_URL = client.defaults.baseURL;

// ─── Refresh Token State ──────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

export const resetInterceptorState = () => {
  isRefreshing = false;
  failedQueue  = [];
};

const processQueue = (error = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

// ─── Auth URL Guard ───────────────────────────────────────────
const isAuthUrl = (url = '') =>
  typeof url === 'string' &&
  (
    url.includes('/auth/login')         ||
    url.includes('/auth/admin/recover') ||
    url.includes('/auth/me')            ||
    url.includes('/auth/refresh')       ||
    url.includes('/auth/logout')
  );

client.interceptors.response.use(
  (res) => res,

  async (error) => {
    const original = error.config || {};
    const status   = error.response?.status;
    const url      = original.url || '';

    // ── Suppress expected 401 on /auth/me during initial app check
    if (status === 401 && url.includes('/auth/me')) {
      return Promise.reject(error);
    }

    if (status !== 401) {
      return Promise.reject(error);
    }

    // ── Prevent retry loop on already-retried or auth endpoints
    if (original._retry || isAuthUrl(url)) {
      return Promise.reject(error);
    }

    // ── Queue requests while refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => client(original))
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      // Refresh the access token
      await client.post('/auth/refresh', {}, { _retry: true });
      processQueue();
      return client(original);
    } catch (refreshErr) {
      processQueue(refreshErr);
      resetInterceptorState();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;