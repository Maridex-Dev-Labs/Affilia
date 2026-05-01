import axios from 'axios';
import { supabase } from '@/lib/supabase/client';

export class BackendUnavailableError extends Error {
  constructor(message = 'Backend unavailable.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export function isBackendUnavailableError(error: unknown) {
  return error instanceof BackendUnavailableError;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 4000,
});

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return Promise.reject(new BackendUnavailableError());
      }

      const detail =
        typeof error.response.data?.detail === 'string'
          ? error.response.data.detail
          : error.message;
      return Promise.reject(new Error(detail));
    }

    return Promise.reject(error);
  },
);
