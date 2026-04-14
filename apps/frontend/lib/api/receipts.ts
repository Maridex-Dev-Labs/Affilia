import { apiClient } from './client';

export const receiptsApi = {
  list: async () => (await apiClient.get('/api/receipts')).data,
  get: async (id: string) => (await apiClient.get(`/api/receipts/${id}`)).data,
};
