import { apiClient } from './client';

export const merchantApi = {
  dashboard: () => apiClient.get('/api/merchants/dashboard'),
  escrow: () => apiClient.get('/api/merchants/escrow'),
  createProduct: (payload: any) => apiClient.post('/api/merchants/products', payload),
  deposit: (payload: any) => apiClient.post('/api/merchants/deposit', payload),
};
