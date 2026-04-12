'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

export default function Page() {
  const { user } = useAdminAuth();
  const [tutors, setTutors] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async () => {
    const [tutorRes, membershipRes] = await Promise.all([
      supabase.from('academy_tutor_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('academy_memberships').select('*'),
    ]);
    const tutorsData = tutorRes.data || [];
    const memberships = membershipRes.data || [];
    const userIds = tutorsData.map((item) => item.user_id);
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, xp_points, level').in('id', userIds);
      profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
    }
    setTutors(
      tutorsData.map((tutor) => ({
        ...tutor,
        profile: profileMap[tutor.user_id],
        membership: memberships.find((membership) => membership.user_id === tutor.user_id) || null,
      }))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const updateTutor = async (tutor: any, nextStatus: 'approved' | 'rejected' | 'suspended') => {
    if (!user || pendingId) return;
    setPendingId(tutor.id + nextStatus);
    await supabase
      .from('academy_tutor_profiles')
      .update({
        status: nextStatus,
        approved_by: nextStatus === 'approved' ? user.id : tutor.approved_by,
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : tutor.approved_at,
        rejection_reason: nextStatus === 'rejected' ? 'Rejected by academy admin.' : null,
      })
      .eq('id', tutor.id);

    if (nextStatus === 'approved') {
      await supabase.from('academy_memberships').upsert(
        {
          user_id: tutor.user_id,
          access_level: 'premium',
          source: 'academy_admin',
          notes: 'Tutor approval grants premium academy access.',
        },
        { onConflict: 'user_id' }
      );
    }

    await load();
    setPendingId(null);
  };

  const togglePremium = async (tutor: any) => {
    if (pendingId) return;
    setPendingId(tutor.id + 'membership');
    await supabase.from('academy_memberships').upsert(
      {
        user_id: tutor.user_id,
        access_level: tutor.membership?.access_level === 'premium' ? 'free' : 'premium',
        source: 'academy_admin',
        notes: 'Updated from academy tutor management.',
      },
      { onConflict: 'user_id' }
    );
    await load();
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tutor Management</h1>
        <p className="mt-2 text-sm text-muted">Approve teaching applications and manage premium academy access.</p>
      </div>
      <div className="space-y-4">
        {tutors.map((tutor) => (
          <div key={tutor.id} className="card-surface p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  <span>{tutor.status}</span>
                  <span>{tutor.membership?.access_level || 'free'}</span>
                  {tutor.is_featured && <span className="text-kenya-green">featured</span>}
                </div>
                <h2 className="mt-2 text-xl font-bold">{tutor.profile?.full_name || 'Affiliate'}</h2>
                <p className="mt-1 text-sm text-muted">{tutor.headline || 'No headline set'}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{tutor.bio}</p>
                <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Expertise</p>
                    <p className="mt-1">{(tutor.expertise || []).join(', ') || 'General affiliate growth'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">XP / Level</p>
                    <p className="mt-1">{tutor.profile?.xp_points || 0} XP · L{tutor.profile?.level || 1}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Google Meet Email</p>
                    <p className="mt-1">{tutor.google_meet_email || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 xl:w-72 xl:justify-end">
                <button onClick={() => updateTutor(tutor, 'approved')} disabled={!!pendingId} className="rounded-full bg-kenya-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === tutor.id + 'approved' ? 'Saving...' : 'Approve'}</button>
                <button onClick={() => updateTutor(tutor, 'rejected')} disabled={!!pendingId} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === tutor.id + 'rejected' ? 'Saving...' : 'Reject'}</button>
                <button onClick={() => updateTutor(tutor, 'suspended')} disabled={!!pendingId} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60">{pendingId === tutor.id + 'suspended' ? 'Saving...' : 'Suspend'}</button>
                <button onClick={() => togglePremium(tutor)} disabled={!!pendingId} className="rounded-full border border-kenya-green/40 px-4 py-2 text-sm text-kenya-green disabled:opacity-60">{pendingId === tutor.id + 'membership' ? 'Updating...' : tutor.membership?.access_level === 'premium' ? 'Set free access' : 'Grant premium'}</button>
              </div>
            </div>
          </div>
        ))}
        {tutors.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-sm text-muted">No tutor applications yet.</div>}
      </div>
    </div>
  );
}
