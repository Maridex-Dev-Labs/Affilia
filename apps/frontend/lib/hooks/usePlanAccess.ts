'use client';

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useProfile } from './useProfile';
import { canAccessWorkspacePath, hasAffiliateOperationalAccess } from '@/lib/access/workspace';

type PlanSelectionRecord = {
  profile_id: string;
  role: 'merchant' | 'affiliate';
  plan_code: string;
  status: 'pending_payment' | 'pending_verification' | 'active' | 'expired' | 'cancelled';
  plan_name: string;
};

function makeChannelName(prefix: string, id: string) {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}:${id}:${suffix}`;
}

export function usePlanAccess() {
  const { profile, loading: profileLoading } = useProfile();
  const [selection, setSelection] = useState<PlanSelectionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setSelection(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('profile_plan_selections')
        .select('*')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setSelection((data as PlanSelectionRecord | null) || null);
        setLoading(false);
      }
    };

    setLoading(true);
    void load();

    const channel = supabase
      .channel(makeChannelName('plan-access', profile.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_plan_selections', filter: `profile_id=eq.${profile.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, load)
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const activePlanCode = profile?.active_plan_code || (selection?.status === 'active' ? selection.plan_code : null);
  const activePlanStatus = profile?.plan_status || selection?.status || 'inactive';
  const affiliateVerificationStatus = profile?.affiliate_verification_status || 'not_started';

  const model = useMemo(() => {
    const role = profile?.role;
    return {
      selection,
      activePlanCode,
      activePlanStatus,
      affiliateVerificationStatus,
      role,
      canAccessPath(pathname: string) {
        if (!role || (role !== 'merchant' && role !== 'affiliate')) return false;
        return canAccessWorkspacePath({
          role,
          pathname,
          activePlanCode,
          affiliateVerificationStatus,
        });
      },
      canGenerateAffiliateLinks:
        role === 'affiliate' && hasAffiliateOperationalAccess(activePlanCode, affiliateVerificationStatus),
      isAffiliateVerified: affiliateVerificationStatus === 'verified',
    };
  }, [selection, activePlanCode, activePlanStatus, affiliateVerificationStatus, profile?.role]);

  return { ...model, loading: loading || profileLoading };
}
