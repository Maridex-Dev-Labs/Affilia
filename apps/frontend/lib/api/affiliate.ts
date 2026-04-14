import { apiClient } from './client';

type GenerateLinkPayload = {
  product_id: string;
};

export const affiliateApi = {
  dashboard: async () => (await apiClient.get('/api/affiliates/dashboard')).data,
  marketplace: async () => (await apiClient.get('/api/affiliates/marketplace')).data,
  generateLink: async (payload: GenerateLinkPayload) => (await apiClient.post('/api/affiliates/generate-link', payload)).data,
  leaderboard: async () => (await apiClient.get('/api/affiliates/leaderboard')).data,
};
