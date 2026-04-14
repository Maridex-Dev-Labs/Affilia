import { apiClient } from './client';

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

export const merchantApi = {
  dashboard: async () => (await apiClient.get('/api/merchants/dashboard')).data,
  escrow: async () => (await apiClient.get('/api/merchants/escrow')).data,
  createProduct: async (payload: CreateProductPayload) => (await apiClient.post('/api/merchants/products', payload)).data,
  deposit: async (payload: DepositPayload) => (await apiClient.post('/api/merchants/deposit', payload)).data,
};
