import { apiRequest } from './api';

export const stockService = {
  async getStocks() {
    return apiRequest('/api/stocks');
  },

  async getStock(id) {
    return apiRequest(`/api/stocks/${id}`);
  },

  async addStock(stockData) {
    return apiRequest('/api/stocks', {
      method: 'POST',
      body: stockData
    });
  },

  async updateStock(id, stockData) {
    return apiRequest(`/api/stocks/${id}`, {
      method: 'PUT',
      body: stockData
    });
  },

  async deleteStock(id) {
    return apiRequest(`/api/stocks/${id}`, {
      method: 'DELETE'
    });
  },

  async sellStock(id, sellData) {
    return apiRequest(`/api/stocks/${id}/sell`, {
      method: 'POST',
      body: sellData
    });
  },

  async defectiveStock(id, defectiveData) {
    return apiRequest(`/api/stocks/${id}/defective`, {
      method: 'POST',
      body: defectiveData
    });
  },

  async getActivities({ period = 'all', date = '', sort = 'desc' } = {}) {
    let query = `?sort=${sort}`;
    if (date) {
      query += `&date=${date}`;
    } else if (period && period !== 'all') {
      query += `&period=${period}`;
    }
    return apiRequest(`/api/activities${query}`);
  }
};

export default stockService;
