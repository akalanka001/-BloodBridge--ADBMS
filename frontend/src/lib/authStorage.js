const STORAGE_KEY = 'bb_session';

export const authStorage = {
  get() {
    try {
      if (typeof window === 'undefined') return null;
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      // Legacy fallback
      const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('bloodbridge_token');
      if (token) return { token };
      return null;
    } catch {
      return null;
    }
  },
  getToken() {
    return this.get()?.token || '';
  },
  getRefreshToken() {
    return this.get()?.refreshToken || '';
  },
  getUser() {
    return this.get()?.user || null;
  },
  set(session) {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      // Remove legacy keys
      localStorage.removeItem('token');
      localStorage.removeItem('bloodbridge_token');
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  },
  clear() {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('bloodbridge_token');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  },
};
