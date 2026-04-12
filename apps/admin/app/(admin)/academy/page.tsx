'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [stats, setStats] = useState<any[]>([]);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [tutorsRes, postsRes, sessionsRes, membershipsRes] = await Promise.all([
        supabase.from('academy_tutor_profiles').select('id, user_id, status, headline, created_at').order('created_at', { ascending: false }),
        supabase.from('academy_posts').select('id, status'),
        supabase.from('academy_sessions').select('id, status, starts_at, title, tutor_id').order('starts_at', { ascending: true }),
        supabase.from('academy_memberships').select('id, access_level'),
      ]);

      const tutors = tutorsRes.data || [];
      const posts = postsRes.data || [];
      const sessions = sessionsRes.data || [];
      const memberships = membershipsRes.data || [];
      const tutorIds = tutors.map((tutor) => tutor.user_id);
      let profileMap: Record<string, any> = {};
      if (tutorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', tutorIds);
        profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
      }

      setStats([
        { label: 'Tutor Applications', value: tutors.filter((t) => t.status === 'pending').length },
        { label: 'Approved Tutors', value: tutors.filter((t) => t.status === 'approved').length },
        { label: 'Published Lessons', value: posts.filter((p) => p.status === 'published').length },
        { label: 'Premium Members', value: memberships.filter((m) => m.access_level === 'premium').length },
      ]);

      setPendingTutors(
        tutors
          .filter((tutor) => tutor.status === 'pending')
          .slice(0, 5)
          .map((tutor) => ({ ...tutor, full_name: profileMap[tutor.user_id]?.full_name || 'Affiliate' }))
      );
      setUpcomingSessions(
        sessions
          .filter((session) => session.status === 'scheduled' || session.status === 'live')
          .slice(0, 5)
      );
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Academy Management</h1>
          <p className="mt-2 text-sm text-muted">Approve tutors, manage live training, and keep academy content useful.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/academy/tutors" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5">Tutors</Link>
          <Link href="/academy/sessions" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5">Sessions</Link>
          <Link href="/academy/posts" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Posts</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <div className="mt-2 text-3xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-xl font-bold">Pending tutor applications</h2>
          <div className="mt-4 space-y-3">
            {pendingTutors.map((tutor) => (
              <div key={tutor.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{tutor.full_name}</h3>
                    <p className="mt-1 text-sm text-muted">{tutor.headline || 'No headline yet'}</p>
                  </div>
                  <Link href="/academy/tutors" className="text-sm text-kenya-green hover:underline">Review</Link>
                </div>
              </div>
            ))}
            {pendingTutors.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No pending tutor approvals.</div>}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-xl font-bold">Upcoming live sessions</h2>
          <div className="mt-4 space-y-3">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{session.title}</h3>
                    <p className="mt-1 text-sm text-muted">{new Date(session.starts_at).toLocaleString('en-KE')}</p>
                  </div>
                  <Link href="/academy/sessions" className="text-sm text-kenya-green hover:underline">Manage</Link>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No upcoming sessions yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
