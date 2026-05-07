import { apiClient, BackendUnavailableError, isBackendUnavailableError } from './client';
import { generateAffiliateLinkFallback, getAffiliateLinkQuotaFallback, listAffiliateLinksFallback, mutateAffiliateLinkFallback } from './fallbacks';
import { supabase } from '@/lib/supabase/client';

type GenerateLinkPayload = {
  product_id: string;
};

type AffiliateVerificationPayload = {
  national_id_number: string;
  id_front_path: string;
  id_back_path: string;
};

export const affiliateApi = {
  dashboard: async () => (await apiClient.get('/api/affiliates/dashboard')).data,
  marketplace: async () => (await apiClient.get('/api/affiliates/marketplace')).data,
  generateLink: async (payload: GenerateLinkPayload) => {
    try {
      return (await apiClient.post('/api/affiliates/generate-link', payload)).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return generateAffiliateLinkFallback(payload.product_id);
      }
      throw error;
    }
  },
  leaderboard: async () => (await apiClient.get('/api/affiliates/leaderboard')).data,
  linkQuota: async () => {
    try {
      return (await apiClient.get('/api/affiliates/link-quota')).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return getAffiliateLinkQuotaFallback();
      }
      throw error;
    }
  },
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
  submitVerification: async (payload: AffiliateVerificationPayload) => {
    try {
      return (await apiClient.post('/api/affiliates/verification/submit', payload)).data;
    } catch (error) {
      const shouldUseInternalFallback =
        isBackendUnavailableError(error) ||
        (error instanceof Error && /temporarily unavailable/i.test(error.message));

      if (!shouldUseInternalFallback) throw error;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in and try again.');

      const response = await fetch('/api/internal/affiliate-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (typeof body.detail === 'string') throw new Error(body.detail);
        throw new BackendUnavailableError();
      }

      return body;
    }
  },
};
