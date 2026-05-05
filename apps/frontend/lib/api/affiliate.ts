import { apiClient, isBackendUnavailableError } from './client';
import { listAffiliateLinksFallback, mutateAffiliateLinkFallback } from './fallbacks';

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
  links: async () => {
    try {
      return (await apiClient.get('/api/affiliates/links')).data;
    } catch (error) {
      if (isBackendUnavailableError(error) || error instanceof Error) {
        return listAffiliateLinksFallback();
      }
      throw error;
    }
  },
  pauseLink: async (linkId: string) => {
    try {
      return (await apiClient.post(`/api/affiliates/links/${linkId}/pause`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error) || error instanceof Error) return mutateAffiliateLinkFallback(linkId, 'pause');
      throw error;
    }
  },
  resumeLink: async (linkId: string) => {
    try {
      return (await apiClient.post(`/api/affiliates/links/${linkId}/resume`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error) || error instanceof Error) return mutateAffiliateLinkFallback(linkId, 'resume');
      throw error;
    }
  },
  archiveLink: async (linkId: string) => {
    try {
      return (await apiClient.post(`/api/affiliates/links/${linkId}/archive`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error) || error instanceof Error) return mutateAffiliateLinkFallback(linkId, 'archive');
      throw error;
    }
  },
  deleteLink: async (linkId: string) => {
    try {
      return (await apiClient.delete(`/api/affiliates/links/${linkId}`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error) || error instanceof Error) return mutateAffiliateLinkFallback(linkId, 'delete');
      throw error;
    }
  },
  submitVerification: async (payload: AffiliateVerificationPayload) => (await apiClient.post('/api/affiliates/verification/submit', payload)).data,
};
