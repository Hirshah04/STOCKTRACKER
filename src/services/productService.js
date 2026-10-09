import { apiRequest } from './api';

export const productService = {
  async getProducts() {
    return apiRequest('/api/products');
  },

  async createProduct({ name, category }) {
    return apiRequest('/api/products', {
      method: 'POST',
      body: { name, category }
    });
  }
};

export default productService;
