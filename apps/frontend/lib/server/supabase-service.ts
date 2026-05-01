import 'server-only';

import { createClient } from '@supabase/supabase-js';

type AuthenticatedUser = {
  id: string;
  email?: string;
};

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name];
  if (!value) {
    throw new Error('Workspace services are temporarily unavailable.');
  }
  return value;
}

export function createServiceRoleClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function createAnonServerClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function getAuthenticatedUserFromRequest(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    throw new Error('Please sign in and try again.');
  }

  const anonClient = createAnonServerClient();
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Please sign in and try again.');
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}
