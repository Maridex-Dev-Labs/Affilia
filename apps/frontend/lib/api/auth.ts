import { apiClient } from './client';

export const authApi = {
  register: (payload: any) => apiClient.post('/api/auth/register', payload),
  login: (payload: any) => apiClient.post('/api/auth/login', payload),
};
