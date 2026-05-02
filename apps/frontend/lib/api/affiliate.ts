import { apiClient } from './client';

type GenerateLinkPayload = {
  product_id: string;
};

type AffiliateVerificationPayload = {
  national_id_number: string;
};

export const affiliateApi = {
  dashboard: async () => (await apiClient.get('/api/affiliates/dashboard')).data,
  marketplace: async () => (await apiClient.get('/api/affiliates/marketplace')).data,
  generateLink: async (payload: GenerateLinkPayload) => (await apiClient.post('/api/affiliates/generate-link', payload)).data,
  leaderboard: async () => (await apiClient.get('/api/affiliates/leaderboard')).data,
  links: async () => (await apiClient.get('/api/affiliates/links')).data,
  pauseLink: async (linkId: string) => (await apiClient.post(`/api/affiliates/links/${linkId}/pause`)).data,
  resumeLink: async (linkId: string) => (await apiClient.post(`/api/affiliates/links/${linkId}/resume`)).data,
  archiveLink: async (linkId: string) => (await apiClient.post(`/api/affiliates/links/${linkId}/archive`)).data,
  deleteLink: async (linkId: string) => (await apiClient.delete(`/api/affiliates/links/${linkId}`)).data,
  submitVerification: async (payload: AffiliateVerificationPayload) => (await apiClient.post('/api/affiliates/verification/submit', payload)).data,
};
