import { apiClient } from './client';

export const productsApi = {
  list: () => apiClient.get('/api/affiliates/marketplace'),
};
