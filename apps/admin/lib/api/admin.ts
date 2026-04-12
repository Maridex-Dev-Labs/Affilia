'use client';

import { adminApiClient } from './client';

export const adminApi = {
  verificationQueue: () => adminApiClient.get('/api/admin/verification-queue'),
  verifyMerchant: (merchantId: string) => adminApiClient.post(`/api/admin/verify-merchant/${merchantId}`),
  pendingDeposits: () => adminApiClient.get('/api/admin/deposits/pending'),
  approveDeposit: (depositId: string) => adminApiClient.post(`/api/admin/deposits/${depositId}/approve`),
  sweepPreview: () => adminApiClient.get('/api/admin/sweep/preview'),
  confirmSweep: () => adminApiClient.post('/api/admin/sweep/confirm'),
};
