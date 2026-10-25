import { api } from './api.js';
import { authStorage } from './authStorage.js';

export { authStorage };

export const authApi = {
  async registerDonor(data) {
    return api('/auth/register-donor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(email, password) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      authStorage.set({
        token: res.token,
        refreshToken: res.refreshToken,
        user: res.user,
      });
    }
    return res;
  },

  async refresh() {
    const session = authStorage.get();
    if (!session?.refreshToken) {
      throw new Error('No refresh token available');
    }
    const res = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (res.token) {
      const updated = {
        token: res.token,
        refreshToken: res.refreshToken,
        user: res.user,
      };
      authStorage.set(updated);
      return updated;
    }
    return res;
  },

  async logout() {
    const session = authStorage.get();
    try {
      if (session?.refreshToken) {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      }
    } catch (err) {
      console.warn('Logout notification failed, clearing client state:', err);
    } finally {
      authStorage.clear();
    }
  },

  async getMe(token) {
    return api('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  async getMemberships(token) {
    return api('/auth/memberships', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  async forgotPassword(email) {
    return api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, password, confirmPassword) {
    return api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    });
  },

  async verifyEmail(token) {
    return api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async acceptInvite(data) {
    return api('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
