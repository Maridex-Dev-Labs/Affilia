import { supabase } from '@/lib/supabase/admin-client';

export async function enrollTotp() {
  return supabase.auth.mfa.enroll({ factorType: 'totp' });
}

export async function challengeTotp(factorId: string) {
  return supabase.auth.mfa.challenge({ factorId });
}

export async function verifyTotp(factorId: string, challengeId: string, code: string) {
  return supabase.auth.mfa.verify({ factorId, challengeId, code });
}
