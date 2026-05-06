import { BackendUnavailableError, apiClient } from './client';
import { supabase } from '@/lib/supabase/client';

type CreateProductPayload = {
  title: string;
  description?: string | null;
  price_kes: number;
  commission_percent: number;
  images?: string[];
  category?: string | null;
};

type DepositPayload = {
  amount_kes: number;
  mpesa_code?: string | null;
  screenshot_url?: string | null;
};

type ManualSalePayload = {
  product_id: string;
  affiliate_code: string;
  sale_amount_kes: number;
  quantity: number;
  customer_reference: string;
  notes?: string | null;
};

export const merchantApi = {
  dashboard: async () => (await apiClient.get('/api/merchants/dashboard')).data,
  escrow: async () => (await apiClient.get('/api/merchants/escrow')).data,
  createProduct: async (payload: CreateProductPayload) => (await apiClient.post('/api/merchants/products', payload)).data,
  deposit: async (payload: DepositPayload) => (await apiClient.post('/api/merchants/deposit', payload)).data,
  recordAffiliateSale: async (productId: string, payload: ManualSalePayload) => {
    try {
      return (await apiClient.post(`/api/merchants/products/${productId}/record-sale`, payload)).data;
    } catch (error) {
      if (!(error instanceof BackendUnavailableError) && !(error instanceof Error && error.message === 'This workspace is temporarily unavailable. Please try again later.')) {
        throw error;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw error;
      }

      const response = await fetch('/api/internal/merchant-sales', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.detail === 'string' ? body.detail : 'We could not submit the affiliate sale right now.');
      }

      return body;
    }
  },
};
