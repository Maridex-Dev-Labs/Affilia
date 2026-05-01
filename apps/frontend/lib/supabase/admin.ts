import 'server-only';

import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://placeholder-project.supabase.co';
const FALLBACK_SUPABASE_SERVICE_KEY = 'service-role-key-missing';

export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_SERVICE_KEY;
  return createClient(url, service);
};
