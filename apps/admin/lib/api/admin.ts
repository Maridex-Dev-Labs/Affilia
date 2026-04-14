'use client';

import { adminApiClient } from './client';

export const adminApi = {
  verificationQueue: async () => (await adminApiClient.get('/api/admin/verification-queue')).data,
  verifyMerchant: async (merchantId: string) => (await adminApiClient.post(`/api/admin/verify-merchant/${merchantId}`)).data,
  pendingDeposits: async () => (await adminApiClient.get('/api/admin/deposits/pending')).data,
  approveDeposit: async (depositId: string) => (await adminApiClient.post(`/api/admin/deposits/${depositId}/approve`)).data,
  sweepPreview: async () => (await adminApiClient.get('/api/admin/sweep/preview')).data,
  confirmSweep: async () => (await adminApiClient.post('/api/admin/sweep/confirm')).data,
};
