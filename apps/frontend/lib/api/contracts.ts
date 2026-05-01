import { supabase } from '@/lib/supabase/client';
import { apiClient, isBackendUnavailableError } from './client';
import type { AgreementType } from '@/lib/legal/contracts';

export type SubmitAgreementPayload = {
  agreement_type: AgreementType;
  acceptance_method: 'digital_signature' | 'uploaded_pdf' | 'manual_signature';
  accepted_terms: boolean;
  accepted_fees: boolean;
  accepted_privacy: boolean;
  accepted_dispute: boolean;
  digital_signature?: string | null;
  signature_full_name?: string | null;
  signed_contract_storage_path?: string | null;
  signed_contract_filename?: string | null;
  signed_contract_size_bytes?: number | null;
  signed_contract_mime_type?: string | null;
};

async function callInternal(input: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Fallback contract request failed.');
  }

  return response;
}

export const contractApi = {
  current: async (agreementType?: AgreementType) => {
    try {
      return (
        await apiClient.get('/api/contracts/current', {
          params: agreementType ? { agreement_type: agreementType } : undefined,
        })
      ).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      const params = agreementType ? `?agreement_type=${agreementType}` : '';
      return (await callInternal(`/api/internal/contracts/current${params}`)).json();
    }
  },
  submit: async (payload: SubmitAgreementPayload) => {
    try {
      return (await apiClient.post('/api/contracts/submit', payload)).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return (await callInternal('/api/internal/contracts/submit', { method: 'POST', body: JSON.stringify(payload) })).json();
    }
  },
  downloadTemplate: async (agreementType: AgreementType) => {
    try {
      return (
        await apiClient.get(`/api/contracts/${agreementType}/download`, {
          responseType: 'blob',
        })
      ).data as Blob;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return await (await callInternal(`/api/internal/contracts/${agreementType}/download`)).blob();
    }
  },
};
