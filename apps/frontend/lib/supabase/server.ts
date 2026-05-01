import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://placeholder-project.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key-missing';

export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  return createClient(url, anon);
};
