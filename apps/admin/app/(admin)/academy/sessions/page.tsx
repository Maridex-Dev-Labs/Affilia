'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async () => {
    const [sessionsRes, tutorsRes, attendeesRes] = await Promise.all([
      supabase.from('academy_sessions').select('*').order('starts_at', { ascending: true }),
      supabase.from('academy_tutor_profiles').select('id, user_id, headline'),
      supabase.from('academy_session_attendees').select('session_id, attendance_status'),
    ]);

    const tutors = tutorsRes.data || [];
    const tutorUserIds = tutors.map((tutor) => tutor.user_id);
    let profileMap: Record<string, any> = {};
    if (tutorUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', tutorUserIds);
      profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
    }

    const counts = (attendeesRes.data || []).reduce((acc: Record<string, number>, attendee: any) => {
      if (attendee.attendance_status !== 'cancelled') {
        acc[attendee.session_id] = (acc[attendee.session_id] || 0) + 1;
      }
      return acc;
    }, {});

    setSessions(
      (sessionsRes.data || []).map((session) => {
        const tutor = tutors.find((item) => item.id === session.tutor_id);
        return {
          ...session,
          attendee_count: counts[session.id] || 0,
          tutor_name: tutor ? profileMap[tutor.user_id]?.full_name || 'Tutor' : 'Tutor',
          tutor_headline: tutor?.headline || 'Affiliate coach',
        };
      })
    );
  };

  useEffect(() => {
    load();
  }, []);

  const updateSession = async (session: any, changes: any, key: string) => {
    if (pendingId) return;
    setPendingId(session.id + key);
    await supabase.from('academy_sessions').update(changes).eq('id', session.id);
    await load();
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Academy Sessions</h1>
        <p className="mt-2 text-sm text-muted">Control the live teaching schedule and session visibility.</p>
      </div>
      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="card-surface p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  <span>{session.status}</span>
                  <span>{session.level}</span>
                  <span>{session.access_level}</span>
                  {session.featured && <span className="text-kenya-green">featured</span>}
                </div>
                <h2 className="mt-2 text-xl font-bold">{session.title}</h2>
                <p className="mt-2 text-sm text-muted">{session.tutor_name} · {session.tutor_headline}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm text-white/75">{session.description}</p>
                <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Starts</p>
                    <p className="mt-1">{new Date(session.starts_at).toLocaleString('en-KE')}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Seats</p>
                    <p className="mt-1">{session.attendee_count}{session.seat_limit ? ` / ${session.seat_limit}` : ' enrolled'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Meeting</p>
                    <p className="mt-1">{session.meeting_url || 'No link yet'}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 xl:w-80 xl:justify-end">
                <button onClick={() => updateSession(session, { status: 'live' }, 'live')} disabled={!!pendingId} className="rounded-full bg-kenya-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === session.id + 'live' ? 'Saving...' : 'Mark live'}</button>
                <button onClick={() => updateSession(session, { status: 'completed' }, 'complete')} disabled={!!pendingId} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{pendingId === session.id + 'complete' ? 'Saving...' : 'Mark completed'}</button>
                <button onClick={() => updateSession(session, { status: 'cancelled' }, 'cancel')} disabled={!!pendingId} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === session.id + 'cancel' ? 'Saving...' : 'Cancel'}</button>
                <button onClick={() => updateSession(session, { featured: !session.featured }, 'feature')} disabled={!!pendingId} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60">{pendingId === session.id + 'feature' ? 'Saving...' : session.featured ? 'Unfeature' : 'Feature'}</button>
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-sm text-muted">No academy sessions yet.</div>}
      </div>
    </div>
  );
}
