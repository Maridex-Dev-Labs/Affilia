'use client';

import axios from 'axios';

import { supabase } from '@/lib/supabase/admin-client';

export const adminApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

adminApiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
