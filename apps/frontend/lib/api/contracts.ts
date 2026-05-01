import { apiClient } from './client';
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

export const contractApi = {
  current: async (agreementType?: AgreementType) =>
    (
      await apiClient.get('/api/contracts/current', {
        params: agreementType ? { agreement_type: agreementType } : undefined,
      })
    ).data,
  submit: async (payload: SubmitAgreementPayload) => (await apiClient.post('/api/contracts/submit', payload)).data,
  downloadTemplate: async (agreementType: AgreementType) =>
    (
      await apiClient.get(`/api/contracts/${agreementType}/download`, {
        responseType: 'blob',
      })
    ).data as Blob,
};
