'use client';

import { adminApiClient } from './client';

export const adminApi = {
  verificationQueue: async () => (await adminApiClient.get('/api/admin/verification-queue')).data,
  verifyMerchant: async (merchantId: string) => (await adminApiClient.post(`/api/admin/verify-merchant/${merchantId}`)).data,
  verifyAffiliate: async (affiliateId: string, payload: { notes?: string }) =>
    (await adminApiClient.post(`/api/admin/verify-affiliate/${affiliateId}`, payload)).data,
  rejectAffiliate: async (affiliateId: string, payload: { reason: string }) =>
    (await adminApiClient.post(`/api/admin/verify-affiliate/${affiliateId}/reject`, payload)).data,
  pendingDeposits: async () => (await adminApiClient.get('/api/admin/deposits/pending')).data,
  approveDeposit: async (depositId: string) => (await adminApiClient.post(`/api/admin/deposits/${depositId}/approve`)).data,
  pendingBilling: async () => (await adminApiClient.get('/api/admin/billing/pending')).data,
  approveBilling: async (profileId: string, payload: { notes?: string }) =>
    (await adminApiClient.post(`/api/admin/billing/${profileId}/approve`, payload)).data,
  rejectBilling: async (profileId: string, payload: { reason: string }) =>
    (await adminApiClient.post(`/api/admin/billing/${profileId}/reject`, payload)).data,
  sweepPreview: async () => (await adminApiClient.get('/api/admin/sweep/preview')).data,
  confirmSweep: async () => (await adminApiClient.post('/api/admin/sweep/confirm')).data,
  pendingSalesReview: async () => (await adminApiClient.get('/api/admin/sales-review/pending')).data,
  approveSalesReview: async (conversionId: string, payload: { notes?: string }) =>
    (await adminApiClient.post(`/api/admin/sales-review/${conversionId}/approve`, payload)).data,
  rejectSalesReview: async (conversionId: string, payload: { reason: string }) =>
    (await adminApiClient.post(`/api/admin/sales-review/${conversionId}/reject`, payload)).data,
  contractReviewQueue: async () => (await adminApiClient.get('/api/contracts/admin/review-queue')).data,
  reviewContract: async (agreementId: string, payload: { action: 'approve' | 'reject' | 'request_revision'; review_notes?: string; rejection_reason?: string }) =>
    (await adminApiClient.post(`/api/contracts/admin/${agreementId}/review`, payload)).data,
};
