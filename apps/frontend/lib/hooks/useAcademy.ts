'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export function useAcademy() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<any>(null);
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setMembership(null);
      setTutorProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [{ data: membershipData }, { data: tutorData }] = await Promise.all([
      supabase.from('academy_memberships').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('academy_tutor_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setMembership(membershipData);
    setTutorProfile(tutorData);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const accessLevel = membership?.access_level ?? 'free';
  const isPremium = accessLevel === 'premium';
  const isTutor = tutorProfile?.status === 'approved';

  return {
    membership,
    tutorProfile,
    accessLevel,
    isPremium,
    isTutor,
    loading,
    refresh,
  };
}
