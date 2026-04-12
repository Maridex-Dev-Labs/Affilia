import { apiClient } from './client';

export const receiptsApi = {
  list: () => apiClient.get('/api/receipts'),
  get: (id: string) => apiClient.get(`/api/receipts/${id}`),
};
