export const api = async (path, options = {}, token = '') => {
  const authToken = token || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('bloodbridge_token')) : '');
  const response = await fetch('/api/v1' + path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const apiClient = {
  get: (path, opts = {}) => api(path, { method: 'GET', ...opts }, opts.token),
  post: (path, body, opts = {}) =>
    api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }, opts?.token),
  patch: (path, body, opts = {}) =>
    api(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...opts }, opts?.token),
  put: (path, body, opts = {}) =>
    api(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...opts }, opts?.token),
  delete: (path, opts = {}) => api(path, { method: 'DELETE', ...opts }, opts?.token),
};

