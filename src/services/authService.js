import { apiRequest } from './api';

export const authService = {
  async login(username, password) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    if (res.data?.token) {
      localStorage.setItem('stocktaker_token', res.data.token);
      localStorage.setItem('stocktaker_session', JSON.stringify(res.data.user));
    }
    return res;
  },

  async register(registrationData) {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: registrationData
    });
    if (res.data?.token) {
      localStorage.setItem('stocktaker_token', res.data.token);
      localStorage.setItem('stocktaker_session', JSON.stringify(res.data.user));
    }
    return res;
  },

  logout() {
    localStorage.removeItem('stocktaker_token');
    localStorage.removeItem('stocktaker_session');
  },

  getCurrentUser() {
    const stored = localStorage.getItem('stocktaker_session');
    return stored ? JSON.parse(stored) : null;
  },

  getToken() {
    return localStorage.getItem('stocktaker_token');
  },

  async getShop(shopId) {
    return apiRequest(`/api/shops/${shopId}`);
  },

  async updateShop(shopId, shopData) {
    return apiRequest(`/api/shops/${shopId}`, {
      method: 'PUT',
      body: shopData
    });
  },

  async getUsers() {
    return apiRequest('/api/users');
  },

  async createUser(userData) {
    return apiRequest('/api/users', {
      method: 'POST',
      body: userData
    });
  },

  async deleteUser(username) {
    return apiRequest(`/api/users/${username}`, {
      method: 'DELETE'
    });
  },

  async getStatus() {
    return apiRequest('/api/status');
  }
};

export default authService;
