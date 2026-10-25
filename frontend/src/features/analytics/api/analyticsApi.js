import { api } from '../../../lib/api.js';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, val);
    }
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

export const analyticsApi = {
  getSummary: (token) => api('/analytics/summary', {}, token),

  getDashboard: (token, params = {}) =>
    api(`/analytics/dashboard${buildQuery(params)}`, {}, token),

  getDemandByGroup: (token, params = {}) =>
    api(`/analytics/demand-by-group${buildQuery(params)}`, {}, token),

  getRequestTrends: (token, params = {}) =>
    api(`/analytics/request-trends${buildQuery(params)}`, {}, token),

  getDonationTrends: (token, params = {}) =>
    api(`/analytics/donation-trends${buildQuery(params)}`, {}, token),

  getStockTrends: (token, params = {}) =>
    api(`/analytics/stock-trends${buildQuery(params)}`, {}, token),

  getCampPerformance: (token, params = {}) =>
    api(`/analytics/camp-performance${buildQuery(params)}`, {}, token),

  getTransfers: (token, params = {}) =>
    api(`/analytics/transfers${buildQuery(params)}`, {}, token),

  getEtlRuns: (token) => api('/analytics/etl-runs', {}, token),

  triggerEtlRun: (token, body = {}) =>
    api('/analytics/etl-runs', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  getDataQuality: (token) => api('/analytics/data-quality', {}, token),

  getBenchmarks: (token) => api('/analytics/benchmarks', {}, token),

  runBenchmark: (token, body) =>
    api('/analytics/benchmarks', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  downloadCsv: async (endpoint, params = {}, token, defaultFilename = 'export.csv') => {
    const query = buildQuery({ ...params, format: 'csv' });
    const response = await fetch(`/api/v1${endpoint}${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('CSV export failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
