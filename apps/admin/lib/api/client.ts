'use client';

import axios from 'axios';

import { supabase } from '@/lib/supabase/admin-client';

function recordAdminBackendOutage(message: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    'affilia:admin:backend-outage',
    JSON.stringify({ message, timestamp: new Date().toISOString() }),
  );
  window.dispatchEvent(new CustomEvent('affilia:admin:backend-outage'));
}

export const adminApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 5000,
});

adminApiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && !error.response) {
      recordAdminBackendOutage('Backend is unavailable. Admin-only operations are degraded; user-facing views are using fallback paths where available.');
      return Promise.reject(new Error('Backend unavailable. Admin-sensitive operations require the API service.'));
    }

    if (axios.isAxiosError(error)) {
      const detail =
        typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : error.message;
      return Promise.reject(new Error(detail));
    }

    return Promise.reject(error);
  },
);
