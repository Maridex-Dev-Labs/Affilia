'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAcademy } from '@/lib/hooks/useAcademy';

export default function Page() {
  const { user } = useAuth();
  const { isPremium } = useAcademy();
  const [sessions, setSessions] = useState<any[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [sessionsRes, tutorsRes, attendeesRes, myRes] = await Promise.all([
      supabase
        .from('academy_sessions')
        .select('*')
        .in('status', ['scheduled', 'live', 'completed'])
        .order('featured', { ascending: false })
        .order('starts_at', { ascending: true }),
      supabase.from('academy_tutor_profiles').select('id, user_id, headline').eq('status', 'approved'),
      supabase.from('academy_session_attendees').select('session_id, attendance_status'),
      supabase.from('academy_session_attendees').select('session_id, attendance_status').eq('user_id', user.id),
    ]);

    const tutors = tutorsRes.data || [];
    const sessionRows = sessionsRes.data || [];
    const tutorUserIds = tutors.map((tutor) => tutor.user_id);
    let profileMap: Record<string, any> = {};
    if (tutorUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', tutorUserIds);
      profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
    }

    const attendeeCounts = (attendeesRes.data || []).reduce((acc: Record<string, number>, attendee: any) => {
      if (attendee.attendance_status !== 'cancelled') {
        acc[attendee.session_id] = (acc[attendee.session_id] || 0) + 1;
      }
      return acc;
    }, {});

    setSessions(
      sessionRows.map((session) => {
        const tutor = tutors.find((item) => item.id === session.tutor_id);
        return {
          ...session,
          attendee_count: attendeeCounts[session.id] || 0,
          tutor_name: tutor ? profileMap[tutor.user_id]?.full_name || 'Tutor' : 'Tutor',
          tutor_headline: tutor?.headline || 'Affiliate Coach',
        };
      })
    );

    setRegisteredIds(
      (myRes.data || [])
        .filter((entry) => entry.attendance_status !== 'cancelled')
        .map((entry) => entry.session_id)
    );
  };

  useEffect(() => {
    load();
  }, [user]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (filter === 'all') return true;
      return session.access_level === filter;
    });
  }, [filter, sessions]);

  const handleRegistration = async (session: any) => {
    if (!user || pendingSessionId) return;
    setPendingSessionId(session.id);

    if (registeredIds.includes(session.id)) {
      await supabase
        .from('academy_session_attendees')
        .update({ attendance_status: 'cancelled' })
        .eq('session_id', session.id)
        .eq('user_id', user.id);
    } else {
      await supabase.from('academy_session_attendees').upsert(
        {
          session_id: session.id,
          user_id: user.id,
          attendance_status: 'registered',
        },
        { onConflict: 'session_id,user_id' }
      );
    }

    await load();
    setPendingSessionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Affilia Academy</p>
          <h1 className="mt-2 text-3xl font-bold">Live Sessions</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Google Meet teaching sessions, monetization clinics, and office hours from approved tutors.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'free', 'premium'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm transition ${filter === value ? 'bg-white text-black' : 'border border-white/20 text-white hover:bg-white/5'}`}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!isPremium && (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Premium sessions are visible but only premium members, tutors, and admins can register. Upgrade is handled by the academy team.
        </div>
      )}

      <div className="grid gap-4">
        {visibleSessions.map((session) => {
          const locked = session.access_level === 'premium' && !isPremium;
          const isRegistered = registeredIds.includes(session.id);
          const isFull = session.seat_limit && session.attendee_count >= session.seat_limit;
          return (
            <div key={session.id} className="card-surface p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    <span>{session.level}</span>
                    <span>{session.access_level}</span>
                    <span>{session.status}</span>
                    {session.featured && <span className="rounded-full bg-kenya-green/20 px-2 py-1 text-[10px] text-kenya-green">Featured</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-bold">{session.title}</h2>
                  <p className="mt-2 text-sm text-muted">{session.description}</p>
                  <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Tutor</p>
                      <p className="mt-1">{session.tutor_name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Starts</p>
                      <p className="mt-1">{new Date(session.starts_at).toLocaleString('en-KE')}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Seats</p>
                      <p className="mt-1">{session.attendee_count}{session.seat_limit ? ` / ${session.seat_limit}` : ' enrolled'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Format</p>
                      <p className="mt-1">Google Meet</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 lg:w-60">
                  <button
                    disabled={locked || !!pendingSessionId || (!isRegistered && !!isFull)}
                    onClick={() => handleRegistration(session)}
                    className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingSessionId === session.id ? 'Updating...' : isRegistered ? 'Cancel registration' : isFull ? 'Session full' : locked ? 'Premium required' : 'Register now'}
                  </button>
                  {session.meeting_url && (
                    <a
                      href={session.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 px-4 py-3 text-center text-sm text-white transition hover:bg-white/5"
                    >
                      Open Meet
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {visibleSessions.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-sm text-muted">No sessions match this filter yet.</div>}
      </div>
    </div>
  );
}
