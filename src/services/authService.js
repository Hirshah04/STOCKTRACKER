import { apiRequest } from './api';

export const authService = {
  // Login with Email ID & Password
  async login(email, password) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (res.data?.token) {
      localStorage.setItem('stocktaker_token', res.data.token);
      localStorage.setItem('stocktaker_session', JSON.stringify(res.data.user));
    }
    return res;
  },

  // Register New Shop & Owner Account
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

  // Password Reset APIs
  async forgotPasswordSendOtp(email) {
    return apiRequest('/api/auth/forgot-password/send-otp', {
      method: 'POST',
      body: { email }
    });
  },

  async forgotPasswordVerifyOtp(email, otp) {
    return apiRequest('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: { email, otp }
    });
  },

  async forgotPasswordReset(resetToken, newPassword, confirmPassword) {
    return apiRequest('/api/auth/forgot-password/reset-password', {
      method: 'POST',
      body: { resetToken, newPassword, confirmPassword }
    });
  },

  async getMe() {
    return apiRequest('/api/auth/me');
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

  async deleteUser(identifier) {
    return apiRequest(`/api/users/${identifier}`, {
      method: 'DELETE'
    });
  },

  async getStatus() {
    return apiRequest('/api/status');
  }
};

export default authService;
