'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAcademy } from '@/lib/hooks/useAcademy';

export default function Page() {
  const { user } = useAuth();
  const { isPremium, tutorProfile } = useAcademy();
  const [posts, setPosts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const [postsRes, sessionsRes, tutorsRes, registrationsRes] = await Promise.all([
        supabase
          .from('academy_posts')
          .select('id, title, slug, summary, category, access_level, featured, published_at, author_id')
          .eq('status', 'published')
          .order('featured', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(4),
        supabase
          .from('academy_sessions')
          .select('id, title, topic, level, access_level, starts_at, ends_at, status, seat_limit, tutor_id, meeting_url, featured')
          .in('status', ['scheduled', 'live'])
          .order('featured', { ascending: false })
          .order('starts_at', { ascending: true })
          .limit(5),
        supabase
          .from('academy_tutor_profiles')
          .select('id, user_id, headline, expertise, is_featured, status')
          .eq('status', 'approved')
          .order('is_featured', { ascending: false })
          .limit(3),
        supabase
          .from('academy_session_attendees')
          .select('session_id, attendance_status')
          .eq('user_id', user.id),
      ]);

      const tutorProfiles = tutorsRes.data || [];
      const sessionsData = sessionsRes.data || [];
      const postsData = postsRes.data || [];
      const registrations = registrationsRes.data || [];

      const userIds = Array.from(
        new Set([
          ...postsData.map((post) => post.author_id),
          ...tutorProfiles.map((tutor) => tutor.user_id),
          ...sessionsData.map((session) => tutorProfiles.find((tutor) => tutor.id === session.tutor_id)?.user_id).filter(Boolean),
        ])
      );

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        profilesMap = Object.fromEntries((profiles || []).map((entry) => [entry.id, entry]));
      }

      const sessionIds = sessionsData.map((session) => session.id);
      let attendeeCounts: Record<string, number> = {};
      if (sessionIds.length > 0) {
        const { data: attendees } = await supabase
          .from('academy_session_attendees')
          .select('session_id, attendance_status')
          .in('session_id', sessionIds);
        attendeeCounts = (attendees || []).reduce((acc: Record<string, number>, attendee: any) => {
          if (attendee.attendance_status !== 'cancelled') {
            acc[attendee.session_id] = (acc[attendee.session_id] || 0) + 1;
          }
          return acc;
        }, {});
      }

      setPosts(
        postsData.map((post) => ({
          ...post,
          author_name: profilesMap[post.author_id]?.full_name || 'Tutor',
        }))
      );
      setTutors(
        tutorProfiles.map((tutor) => ({
          ...tutor,
          full_name: profilesMap[tutor.user_id]?.full_name || 'Tutor',
        }))
      );
      setSessions(
        sessionsData.map((session) => {
          const tutor = tutorProfiles.find((item) => item.id === session.tutor_id);
          return {
            ...session,
            attendee_count: attendeeCounts[session.id] || 0,
            tutor_name: tutor ? profilesMap[tutor.user_id]?.full_name || 'Tutor' : 'Tutor',
            tutor_headline: tutor?.headline || 'Affiliate Coach',
          };
        })
      );
      setRegisteredIds(
        registrations
          .filter((entry) => entry.attendance_status !== 'cancelled')
          .map((entry) => entry.session_id)
      );
    };

    load();
  }, [user]);

  const stats = useMemo(
    () => [
      { label: 'Access Tier', value: isPremium ? 'Premium' : 'Free', hint: isPremium ? 'Advanced coaching unlocked' : 'Upgrade managed by admin' },
      { label: 'Upcoming Sessions', value: `${sessions.length}`, hint: 'Live coaching calendar' },
      { label: 'Registered Sessions', value: `${registeredIds.length}`, hint: 'Your current learning plan' },
      { label: 'Tutor Status', value: tutorProfile?.status ? tutorProfile.status.toUpperCase() : 'NONE', hint: tutorProfile ? 'Your teaching application state' : 'Premium affiliates can apply' },
    ],
    [isPremium, sessions.length, registeredIds.length, tutorProfile]
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(187,0,0,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(0,154,68,0.2),_transparent_42%),linear-gradient(135deg,_rgba(20,26,43,0.98),_rgba(10,14,23,0.95))] p-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr,0.9fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/80">
              Affilia Academy
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              Learn affiliate marketing from proven Kenyan performers.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70">
              Structured lessons, premium monetization coaching, and live Google Meet sessions run by approved Affilia tutors.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/affiliate/academy/sessions" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                Explore Live Sessions
              </Link>
              <Link href="/affiliate/academy/tutor" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                {tutorProfile ? 'Tutor Dashboard' : 'Become a Tutor'}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">{stat.label}</p>
                <div className="mt-2 text-2xl font-black">{stat.value}</div>
                <p className="mt-2 text-sm text-white/55">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Fresh Tips & Guidance</h2>
              <p className="mt-1 text-sm text-muted">Daily lessons from approved tutors and the academy desk.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {posts.map((post) => (
              <Link key={post.id} href={`/affiliate/academy/posts/${post.slug}`} className="block rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.05]">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  <span>{post.category}</span>
                  <span>{post.access_level}</span>
                  {post.featured && <span className="rounded-full bg-kenya-green/20 px-2 py-1 text-[10px] text-kenya-green">Featured</span>}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
                <p className="mt-2 text-sm text-muted">{post.summary || 'Open the lesson to read the full guidance.'}</p>
                <p className="mt-3 text-xs text-white/45">By {post.author_name}</p>
              </Link>
            ))}
            {posts.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No academy tips have been published yet.</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Upcoming Sessions</h2>
                <p className="mt-1 text-sm text-muted">Google Meet coaching and practical workshops.</p>
              </div>
              <Link href="/affiliate/academy/sessions" className="text-sm text-kenya-green hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{session.level} · {session.access_level}</p>
                      <h3 className="mt-1 font-semibold">{session.title}</h3>
                    </div>
                    {registeredIds.includes(session.id) && <span className="rounded-full bg-kenya-green/15 px-3 py-1 text-xs text-kenya-green">Registered</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted">{session.tutor_name} · {new Date(session.starts_at).toLocaleString('en-KE')}</p>
                  <p className="mt-1 text-xs text-white/45">{session.attendee_count} learners enrolled</p>
                </div>
              ))}
              {sessions.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No live sessions scheduled yet.</div>}
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="text-xl font-bold">Tutor Spotlight</h2>
            <div className="mt-4 space-y-3">
              {tutors.map((tutor) => (
                <div key={tutor.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{tutor.full_name}</h3>
                      <p className="mt-1 text-sm text-muted">{tutor.headline || 'Affiliate coach'}</p>
                    </div>
                    {tutor.is_featured && <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">Featured</span>}
                  </div>
                  <p className="mt-3 text-xs text-white/45">{(tutor.expertise || []).join(' · ') || 'General affiliate marketing'}</p>
                </div>
              ))}
              {tutors.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">Tutor profiles will appear after approval.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Your next move</h2>
            <p className="mt-1 text-sm text-muted">
              {isPremium
                ? 'You can access advanced coaching and apply to teach if your affiliate performance is strong.'
                : 'Premium access is managed by the academy team. Once upgraded, you unlock advanced classes and tutor applications.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/affiliate/academy/sessions" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/5">
              Plan learning
            </Link>
            <Link href="/affiliate/academy/tutor" className="rounded-full bg-gradient-to-r from-black via-red-700 to-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              {isPremium || tutorProfile ? 'Open tutor workspace' : 'Check tutor eligibility'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
