import { apiClient } from './client';

export const affiliateApi = {
  dashboard: () => apiClient.get('/api/affiliates/dashboard'),
  marketplace: () => apiClient.get('/api/affiliates/marketplace'),
  generateLink: (payload: any) => apiClient.post('/api/affiliates/generate-link', payload),
  leaderboard: () => apiClient.get('/api/affiliates/leaderboard'),
};
