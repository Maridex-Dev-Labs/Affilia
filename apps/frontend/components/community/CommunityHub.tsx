'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChatCircleDots, PaperPlaneTilt, Plus, Users } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import Button, { SecondaryButton } from '@/components/ui/Button';

type CommunityHubProps = {
  role: 'merchant' | 'affiliate';
};

export default function CommunityHub({ role }: CommunityHubProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tab, setTab] = useState<'dm' | 'forum'>('dm');
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const oppositeRole = role === 'merchant' ? 'affiliate' : 'merchant';

  const loadThreads = async () => {
    if (!user) return;
    const { data: myMemberships } = await supabase.from('chat_thread_members').select('thread_id').eq('user_id', user.id);
    const threadIds = (myMemberships || []).map((item) => item.thread_id);
    if (threadIds.length === 0) {
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
      return;
    }

    const [{ data: threadRows }, { data: memberRows }, { data: recentMessages }] = await Promise.all([
      supabase.from('chat_threads').select('*').in('id', threadIds).order('updated_at', { ascending: false }),
      supabase.from('chat_thread_members').select('thread_id, user_id').in('thread_id', threadIds),
      supabase.from('chat_messages').select('thread_id, body, created_at').in('thread_id', threadIds).order('created_at', { ascending: false }),
    ]);

    const otherIds = Array.from(new Set((memberRows || []).filter((row) => row.user_id !== user.id).map((row) => row.user_id)));
    const { data: profiles } = otherIds.length > 0 ? await supabase.from('profiles').select('id, full_name, business_name, avatar_url').in('id', otherIds) : { data: [] as any[] };
    const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
    const groupedRecent = new Map<string, any>();
    (recentMessages || []).forEach((message) => {
      if (!groupedRecent.has(message.thread_id)) groupedRecent.set(message.thread_id, message);
    });

    const list = (threadRows || []).map((thread) => {
      const otherMember = (memberRows || []).find((row) => row.thread_id === thread.id && row.user_id !== user.id);
      return {
        ...thread,
        counterpart: otherMember ? profileMap.get(otherMember.user_id) : null,
        lastMessage: groupedRecent.get(thread.id),
      };
    });

    setThreads(list);
    setSelectedThreadId((current) => current || list[0]?.id || null);
  };

  const loadMessages = async (threadId: string | null) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const { data } = await supabase.from('chat_messages').select('*').eq('thread_id', threadId).order('created_at');
    setMessages(data || []);
  };

  const loadCandidates = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, business_name, avatar_url').eq('role', oppositeRole).limit(50);
    setCandidates(data || []);
  };

  const loadForum = async () => {
    if (!user) return;
    const { data: postRows } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(30);
    const authorIds = Array.from(new Set((postRows || []).map((post) => post.author_id)));
    const { data: authors } = authorIds.length ? await supabase.from('profiles').select('id, full_name, business_name, avatar_url').in('id', authorIds) : { data: [] as any[] };
    const authorMap = new Map((authors || []).map((item) => [item.id, item]));
    const enrichedPosts = (postRows || []).map((post) => ({ ...post, author: authorMap.get(post.author_id) }));
    setPosts(enrichedPosts);

    const postIds = enrichedPosts.map((post) => post.id);
    if (postIds.length === 0) {
      setComments({});
      return;
    }
    const { data: commentRows } = await supabase.from('forum_comments').select('*').in('post_id', postIds).order('created_at');
    const commentAuthorIds = Array.from(new Set((commentRows || []).map((item) => item.author_id)));
    const { data: commentAuthors } = commentAuthorIds.length ? await supabase.from('profiles').select('id, full_name, business_name, avatar_url').in('id', commentAuthorIds) : { data: [] as any[] };
    const commentAuthorMap = new Map((commentAuthors || []).map((item) => [item.id, item]));
    const grouped = (commentRows || []).reduce((acc: Record<string, any[]>, item) => {
      acc[item.post_id] ||= [];
      acc[item.post_id].push({ ...item, author: commentAuthorMap.get(item.author_id) });
      return acc;
    }, {});
    setComments(grouped);
  };

  useEffect(() => {
    if (!user) return;
    loadThreads();
    loadCandidates();
    loadForum();

    const threadChannel = supabase
      .channel(`community:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, loadThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_thread_members', filter: `user_id=eq.${user.id}` }, loadThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, loadForum)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_comments' }, loadForum)
      .subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
    };
  }, [user]);

  useEffect(() => {
    loadMessages(selectedThreadId);
    if (!selectedThreadId) return;
    const messageChannel = supabase
      .channel(`messages:${selectedThreadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${selectedThreadId}` }, () => loadMessages(selectedThreadId))
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedThreadId]);

  const startThread = async () => {
    if (!user || !targetUserId) return;
    setStatus(null);
    const myThreadIds = threads.map((thread) => thread.id);
    if (myThreadIds.length > 0) {
      const { data: existing } = await supabase
        .from('chat_thread_members')
        .select('thread_id')
        .eq('user_id', targetUserId)
        .in('thread_id', myThreadIds)
        .maybeSingle();
      if (existing?.thread_id) {
        setSelectedThreadId(existing.thread_id);
        setTab('dm');
        return;
      }
    }

    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({ created_by: user.id, subject: 'Direct conversation' })
      .select('*')
      .single();
    if (error || !thread) {
      setStatus(error?.message || 'Failed to start conversation.');
      return;
    }

    const { error: membersError } = await supabase.from('chat_thread_members').insert([
      { thread_id: thread.id, user_id: user.id },
      { thread_id: thread.id, user_id: targetUserId },
    ]);
    if (membersError) {
      setStatus(membersError.message);
      return;
    }
    setTargetUserId('');
    await loadThreads();
    setSelectedThreadId(thread.id);
  };

  const sendMessage = async () => {
    if (!user || !selectedThreadId || !messageBody.trim()) return;
    setStatus(null);
    const body = messageBody.trim();
    setMessageBody('');
    const { error } = await supabase.from('chat_messages').insert({ thread_id: selectedThreadId, sender_id: user.id, body });
    if (error) {
      setStatus(error.message);
      setMessageBody(body);
      return;
    }
    await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', selectedThreadId);
  };

  const createPost = async () => {
    if (!user || !postTitle.trim() || !postBody.trim()) return;
    setStatus(null);
    const { error } = await supabase.from('forum_posts').insert({ author_id: user.id, title: postTitle.trim(), content: postBody.trim() });
    if (error) {
      setStatus(error.message);
      return;
    }
    setPostTitle('');
    setPostBody('');
    setStatus('Forum post submitted. It is visible to you immediately and awaits admin moderation.');
  };

  const addComment = async (postId: string) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!user || !body) return;
    setStatus(null);
    const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: user.id, body });
    if (error) {
      setStatus(error.message);
      return;
    }
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
  };

  const selectedThread = useMemo(() => threads.find((thread) => thread.id === selectedThreadId) || null, [threads, selectedThreadId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">Community</h1>
          <p className="text-muted mt-2">Real-time direct chat and moderated forum guidance for {role === 'merchant' ? 'merchants' : 'affiliates'}.</p>
        </div>
        <div className="flex gap-2 rounded-full border border-white/8 bg-black/30 p-1 text-sm font-bold">
          <button className={`rounded-full px-4 py-2 ${tab === 'dm' ? 'bg-white/10 text-white' : 'text-[#8f98ab]'}`} onClick={() => setTab('dm')}>Direct Messages</button>
          <button className={`rounded-full px-4 py-2 ${tab === 'forum' ? 'bg-white/10 text-white' : 'text-[#8f98ab]'}`} onClick={() => setTab('forum')}>Forum</button>
        </div>
      </div>
      {status ? <div className="rounded-2xl border border-[#009A44]/20 bg-[#009A44]/10 px-4 py-3 text-sm text-[#a2e0b7]">{status}</div> : null}

      {tab === 'dm' ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card-surface p-6 space-y-4">
            <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#7e869a]">Start a conversation</div>
            <div className="flex gap-3">
              <select className="input-shell" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
                <option value="">Select {oppositeRole}</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.business_name || candidate.full_name}</option>
                ))}
              </select>
              <Button onClick={startThread} className="whitespace-nowrap"><Plus size={16} /> Start</Button>
            </div>
            <div className="space-y-3">
              {threads.map((thread) => (
                <button key={thread.id} className={`w-full rounded-2xl border px-4 py-3 text-left ${selectedThreadId === thread.id ? 'border-white/20 bg-black/30' : 'border-white/8 bg-black/10'}`} onClick={() => setSelectedThreadId(thread.id)}>
                  <div className="font-bold text-white">{thread.counterpart?.business_name || thread.counterpart?.full_name || 'Conversation'}</div>
                  <div className="mt-1 text-xs text-[#8f98ab]">{thread.lastMessage?.body || thread.subject || 'No messages yet'}</div>
                </button>
              ))}
              {threads.length === 0 ? <div className="text-sm text-muted">No conversations yet.</div> : null}
            </div>
          </div>

          <div className="card-surface p-6 flex min-h-[540px] flex-col">
            <div className="border-b border-white/8 pb-4">
              <div className="text-lg font-bold text-white">{selectedThread?.counterpart?.business_name || selectedThread?.counterpart?.full_name || 'Select a conversation'}</div>
              <div className="text-sm text-[#8f98ab]">Messages sync in real time.</div>
            </div>
            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto py-4">
              {messages.map((message) => {
                const mine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${mine ? 'bg-[#009A44] text-white' : 'bg-black/30 text-[#d2d8e4]'}`}>
                      <div>{message.body}</div>
                      <div className={`mt-2 text-[10px] ${mine ? 'text-white/75' : 'text-[#7e869a]'}`}>{new Date(message.created_at).toLocaleString('en-KE')}</div>
                    </div>
                  </div>
                );
              })}
              {selectedThreadId && messages.length === 0 ? <div className="text-sm text-muted">No messages yet. Say hello.</div> : null}
              {!selectedThreadId ? <div className="flex h-full items-center justify-center text-sm text-muted">Pick or create a conversation.</div> : null}
            </div>
            <div className="mt-4 flex gap-3">
              <input className="input-shell" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Type your message..." />
              <Button onClick={sendMessage}><PaperPlaneTilt size={16} /> Send</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card-surface p-6 space-y-4">
            <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#7e869a]">Post guidance or ask a question</div>
            <input className="input-shell" placeholder="Forum title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            <textarea className="input-shell min-h-[180px]" placeholder="Share a practical question, tip, or lesson for the community." value={postBody} onChange={(e) => setPostBody(e.target.value)} />
            <Button onClick={createPost}><ChatCircleDots size={16} /> Publish post</Button>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#cdd4e1]">
              Forum posts are moderated. Your own pending posts remain visible to you until admin reviews them.
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="card-surface p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{post.title}</h2>
                    <div className="mt-1 text-sm text-[#8f98ab]">
                      by {post.author?.business_name || post.author?.full_name || 'Community member'} · {new Date(post.created_at).toLocaleString('en-KE')}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${post.status === 'approved' ? 'bg-[#009A44]/15 text-[#009A44]' : 'bg-yellow-500/15 text-yellow-300'}`}>{post.status}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#d3d9e4]">{post.content}</p>
                <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7e869a]"><Users size={16} /> Responses</div>
                  <div className="space-y-3">
                    {(comments[post.id] || []).map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <div className="text-sm font-bold text-white">{comment.author?.business_name || comment.author?.full_name || 'Member'}</div>
                        <div className="mt-1 text-sm text-[#cfd5e1]">{comment.body}</div>
                      </div>
                    ))}
                    {(comments[post.id] || []).length === 0 ? <div className="text-sm text-muted">No responses yet.</div> : null}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <input className="input-shell" placeholder="Add a practical reply..." value={commentDrafts[post.id] || ''} onChange={(e) => setCommentDrafts((current) => ({ ...current, [post.id]: e.target.value }))} />
                    <SecondaryButton onClick={() => addComment(post.id)}>Reply</SecondaryButton>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 ? <div className="card-surface p-6 text-muted">No forum posts yet.</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}
