import { apiClient } from './client';

export const trackingApi = {
  click: (payload: any) => apiClient.post('/api/track/click', payload),
};
