import { authStorage } from './authStorage.js';

let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, token = null) {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
}

export const api = async (path, options = {}, token = '') => {
  // 1. Authoritative token retrieval: explicit param -> authStorage (sessionStorage)
  const isInternal = typeof path === 'string' && (path.startsWith('/') || !path.includes('://'));
  const authToken = token || (isInternal ? authStorage.getToken() : '');

  const url = isInternal ? '/api/v1' + path : path;

  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(authToken && isInternal ? { Authorization: 'Bearer ' + authToken } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 2. Handle 401 Unauthorized with token refresh if possible
  if (response.status === 401 && !options._isRetry && isInternal && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshToken = authStorage.getRefreshToken();

    if (!refreshToken) {
      authStorage.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Authentication required');
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        return api(path, { ...options, _isRetry: true }, newToken);
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const refreshData = await refreshRes.json().catch(() => ({}));

      if (!refreshRes.ok || !refreshData.token) {
        throw new Error(refreshData.error || 'Session expired');
      }

      const newSession = {
        token: refreshData.token,
        refreshToken: refreshData.refreshToken || refreshToken,
        user: refreshData.user || authStorage.getUser(),
      };
      authStorage.set(newSession);
      processRefreshQueue(null, refreshData.token);

      return api(path, { ...options, _isRetry: true }, refreshData.token);
    } catch (refreshErr) {
      processRefreshQueue(refreshErr, null);
      authStorage.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      throw new Error('Session expired. Please log in again.');
    } finally {
      isRefreshing = false;
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

export const apiClient = {
  get: (path, opts = {}) => api(path, { method: 'GET', ...opts }, opts.token),
  post: (path, body, opts = {}) =>
    api(path, { method: 'POST', body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined, ...opts }, opts?.token),
  patch: (path, body, opts = {}) =>
    api(path, { method: 'PATCH', body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined, ...opts }, opts?.token),
  put: (path, body, opts = {}) =>
    api(path, { method: 'PUT', body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined, ...opts }, opts?.token),
  delete: (path, opts = {}) => api(path, { method: 'DELETE', ...opts }, opts?.token),
};
