'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAcademy } from '@/lib/hooks/useAcademy';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Page() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { membership, tutorProfile, isPremium, isTutor, refresh } = useAcademy();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [application, setApplication] = useState({ headline: '', bio: '', expertise: '', googleMeetEmail: '' });
  const [postForm, setPostForm] = useState({ title: '', summary: '', content: '', category: 'growth', accessLevel: 'free' });
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', topic: 'monetization', level: 'beginner', accessLevel: 'free', startsAt: '', endsAt: '', meetingUrl: '', seatLimit: '50' });

  const loadTutorData = async () => {
    if (!user) return;
    if (!tutorProfile) return;
    const [postsRes, sessionsRes] = await Promise.all([
      supabase.from('academy_posts').select('id, title, status, access_level, published_at').eq('author_id', user.id).order('created_at', { ascending: false }).limit(6),
      supabase
        .from('academy_sessions')
        .select('id, title, status, level, access_level, starts_at')
        .eq('tutor_id', tutorProfile.id)
        .order('starts_at', { ascending: false })
        .limit(6),
    ]);
    setMyPosts(postsRes.data || []);
    setMySessions(sessionsRes.data || []);
  };

  useEffect(() => {
    loadTutorData();
  }, [user, tutorProfile]);

  const submitApplication = async () => {
    if (!user || loadingAction) return;
    setLoadingAction('application');
    await supabase.from('academy_tutor_profiles').upsert(
      {
        user_id: user.id,
        headline: application.headline,
        bio: application.bio,
        expertise: application.expertise.split(',').map((item) => item.trim()).filter(Boolean),
        google_meet_email: application.googleMeetEmail,
        status: 'pending',
      },
      { onConflict: 'user_id' }
    );
    await refresh();
    setLoadingAction(null);
  };

  const createPost = async () => {
    if (!user || !tutorProfile || loadingAction) return;
    setLoadingAction('post');
    const baseSlug = slugify(postForm.title) || 'academy-post';
    await supabase.from('academy_posts').insert({
      author_id: user.id,
      title: postForm.title,
      slug: `${baseSlug}-${Date.now()}`,
      summary: postForm.summary,
      content: postForm.content,
      category: postForm.category,
      access_level: postForm.accessLevel,
      status: 'published',
      published_at: new Date().toISOString(),
    });
    setPostForm({ title: '', summary: '', content: '', category: 'growth', accessLevel: 'free' });
    await loadTutorData();
    setLoadingAction(null);
  };

  const createSession = async () => {
    if (!tutorProfile || loadingAction) return;
    setLoadingAction('session');
    await supabase.from('academy_sessions').insert({
      tutor_id: tutorProfile.id,
      title: sessionForm.title,
      description: sessionForm.description,
      topic: sessionForm.topic,
      level: sessionForm.level,
      access_level: sessionForm.accessLevel,
      meeting_url: sessionForm.meetingUrl,
      starts_at: new Date(sessionForm.startsAt).toISOString(),
      ends_at: new Date(sessionForm.endsAt).toISOString(),
      seat_limit: sessionForm.seatLimit ? Number(sessionForm.seatLimit) : null,
      status: 'scheduled',
    });
    setSessionForm({ title: '', description: '', topic: 'monetization', level: 'beginner', accessLevel: 'free', startsAt: '', endsAt: '', meetingUrl: '', seatLimit: '50' });
    await loadTutorData();
    setLoadingAction(null);
  };

  const statusTone = useMemo(() => {
    switch (tutorProfile?.status) {
      case 'approved':
        return 'text-kenya-green';
      case 'rejected':
        return 'text-red-300';
      case 'suspended':
        return 'text-amber-300';
      default:
        return 'text-white';
    }
  }, [tutorProfile]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Affilia Academy</p>
        <h1 className="mt-2 text-3xl font-bold">Tutor Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">Premium affiliates can apply to teach, run live Google Meet sessions, and publish monetization guidance.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Affiliate</p>
          <div className="mt-2 text-xl font-bold">{profile?.full_name || 'Your profile'}</div>
          <p className="mt-2 text-sm text-muted">Current academy tier: {(membership?.access_level || 'free').toUpperCase()}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Tutor status</p>
          <div className={`mt-2 text-xl font-bold ${statusTone}`}>{tutorProfile?.status ? tutorProfile.status.toUpperCase() : 'NOT APPLIED'}</div>
          <p className="mt-2 text-sm text-muted">Tutors are approved manually by academy admins.</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Teaching access</p>
          <div className="mt-2 text-xl font-bold">{isTutor ? 'LIVE' : 'LOCKED'}</div>
          <p className="mt-2 text-sm text-muted">Google Meet teaching and content publishing unlock after approval.</p>
        </div>
      </div>

      {!tutorProfile && !isPremium && (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm text-amber-100">
          Tutor applications are reserved for premium affiliates. Ask the academy admin to upgrade your membership before applying.
        </div>
      )}

      {!tutorProfile && isPremium && (
        <section className="card-surface p-6">
          <h2 className="text-xl font-bold">Apply as a tutor</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Headline" value={application.headline} onChange={(e) => setApplication((prev) => ({ ...prev, headline: e.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Google Meet email" value={application.googleMeetEmail} onChange={(e) => setApplication((prev) => ({ ...prev, googleMeetEmail: e.target.value }))} />
            <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm lg:col-span-2" placeholder="Expertise comma separated" value={application.expertise} onChange={(e) => setApplication((prev) => ({ ...prev, expertise: e.target.value }))} />
            <textarea className="min-h-36 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm lg:col-span-2" placeholder="Why should learners trust you?" value={application.bio} onChange={(e) => setApplication((prev) => ({ ...prev, bio: e.target.value }))} />
          </div>
          <button onClick={submitApplication} disabled={!!loadingAction} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-60">
            {loadingAction === 'application' ? 'Submitting...' : 'Submit application'}
          </button>
        </section>
      )}

      {tutorProfile && tutorProfile.status !== 'approved' && (
        <section className="card-surface p-6">
          <h2 className="text-xl font-bold">Application status</h2>
          <p className="mt-3 text-sm text-muted">Current review state: {tutorProfile.status}. {tutorProfile.rejection_reason || 'You will see the updated decision here.'}</p>
        </section>
      )}

      {isTutor && tutorProfile && (
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="card-surface p-6">
              <h2 className="text-xl font-bold">Publish a tip or lesson</h2>
              <div className="mt-5 grid gap-4">
                <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Post title" value={postForm.title} onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))} />
                <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Short summary" value={postForm.summary} onChange={(e) => setPostForm((prev) => ({ ...prev, summary: e.target.value }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Category" value={postForm.category} onChange={(e) => setPostForm((prev) => ({ ...prev, category: e.target.value }))} />
                  <select className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" value={postForm.accessLevel} onChange={(e) => setPostForm((prev) => ({ ...prev, accessLevel: e.target.value }))}>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <textarea className="min-h-48 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Write the lesson content" value={postForm.content} onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))} />
              </div>
              <button onClick={createPost} disabled={!!loadingAction} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-60">
                {loadingAction === 'post' ? 'Publishing...' : 'Publish lesson'}
              </button>
            </div>

            <div className="card-surface p-6">
              <h2 className="text-xl font-bold">Schedule a live Google Meet</h2>
              <div className="mt-5 grid gap-4">
                <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Session title" value={sessionForm.title} onChange={(e) => setSessionForm((prev) => ({ ...prev, title: e.target.value }))} />
                <textarea className="min-h-32 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="What learners will cover" value={sessionForm.description} onChange={(e) => setSessionForm((prev) => ({ ...prev, description: e.target.value }))} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Topic" value={sessionForm.topic} onChange={(e) => setSessionForm((prev) => ({ ...prev, topic: e.target.value }))} />
                  <select className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" value={sessionForm.level} onChange={(e) => setSessionForm((prev) => ({ ...prev, level: e.target.value }))}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" value={sessionForm.accessLevel} onChange={(e) => setSessionForm((prev) => ({ ...prev, accessLevel: e.target.value }))}>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" type="datetime-local" value={sessionForm.startsAt} onChange={(e) => setSessionForm((prev) => ({ ...prev, startsAt: e.target.value }))} />
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" type="datetime-local" value={sessionForm.endsAt} onChange={(e) => setSessionForm((prev) => ({ ...prev, endsAt: e.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr,180px]">
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Google Meet URL" value={sessionForm.meetingUrl} onChange={(e) => setSessionForm((prev) => ({ ...prev, meetingUrl: e.target.value }))} />
                  <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="Seats" value={sessionForm.seatLimit} onChange={(e) => setSessionForm((prev) => ({ ...prev, seatLimit: e.target.value }))} />
                </div>
              </div>
              <button onClick={createSession} disabled={!!loadingAction} className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-60">
                {loadingAction === 'session' ? 'Scheduling...' : 'Schedule live session'}
              </button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="card-surface p-6">
              <h2 className="text-xl font-bold">Recent lessons</h2>
              <div className="mt-4 space-y-3">
                {myPosts.map((post) => (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{post.title}</h3>
                        <p className="mt-1 text-xs text-white/45">{post.status} · {post.access_level}</p>
                      </div>
                      <p className="text-xs text-white/45">{post.published_at ? new Date(post.published_at).toLocaleDateString('en-KE') : 'Draft'}</p>
                    </div>
                  </div>
                ))}
                {myPosts.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No lessons published yet.</div>}
              </div>
            </div>
            <div className="card-surface p-6">
              <h2 className="text-xl font-bold">Scheduled sessions</h2>
              <div className="mt-4 space-y-3">
                {mySessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="mt-1 text-xs text-white/45">{session.level} · {session.status} · {session.access_level}</p>
                      </div>
                      <p className="text-xs text-white/45">{new Date(session.starts_at).toLocaleString('en-KE')}</p>
                    </div>
                  </div>
                ))}
                {mySessions.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No sessions scheduled yet.</div>}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
