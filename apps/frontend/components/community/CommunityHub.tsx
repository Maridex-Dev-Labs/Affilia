'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChatCircleDots, PaperPlaneTilt, Plus, ThumbsDown, ThumbsUp, Users } from '@phosphor-icons/react';

import Button, { SecondaryButton } from '@/components/ui/Button';
import { communityApi } from '@/lib/api/community';
import { sanitizeUserFacingError } from '@/lib/errors';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { uploadCommunityMedia } from '@/lib/supabase/storage';
import { COMMUNITY_MEDIA_GUIDELINES, toCommunityMediaPayload, validateCommunityFiles } from '@/lib/utils/community-media';

type CommunityHubProps = {
  role: 'merchant' | 'affiliate';
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  avatar_url?: string | null;
  role?: 'merchant' | 'affiliate' | null;
};

type ThreadItem = {
  id: string;
  subject?: string | null;
  counterpart?: ProfileLite | null;
  lastMessage?: { body?: string | null } | null;
};

type MessageItem = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  media_url?: string | null;
};

type PostMedia = {
  url: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
};

type ForumPost = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  media?: PostMedia[];
  mention_user_ids?: string[];
  likes_count?: number;
  dislikes_count?: number;
  author?: ProfileLite | null;
  mentions?: ProfileLite[];
  myReaction?: 'like' | 'dislike' | null;
};

type ForumComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  mention_user_ids?: string[];
  author?: ProfileLite | null;
  mentions?: ProfileLite[];
};

type ForumReaction = {
  post_id: string;
  user_id: string;
  reaction: 'like' | 'dislike';
};

export default function CommunityHub({ role }: CommunityHubProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tab, setTab] = useState<'dm' | 'forum'>('dm');
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [directory, setDirectory] = useState<ProfileLite[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<Record<string, ForumComment[]>>({});
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const oppositeRole = role === 'merchant' ? 'affiliate' : 'merchant';
  const dmCandidates = directory.filter((candidate) => candidate.role === oppositeRole);
  const mentionCandidates = directory.filter((candidate) => candidate.id !== user?.id);

  const loadThreads = async () => {
    if (!user) return;

    const { data: myMemberships, error: membershipsError } = await supabase
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', user.id);
    if (membershipsError) {
      setStatus(sanitizeUserFacingError(membershipsError, 'Community is temporarily unavailable.'));
      return;
    }

    const threadIds = (myMemberships || []).map((item) => item.thread_id);
    if (threadIds.length === 0) {
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
      return;
    }

    const [{ data: threadRows, error: threadsError }, { data: memberRows, error: membersError }, { data: recentMessages, error: messagesError }] =
      await Promise.all([
        supabase.from('chat_threads').select('*').in('id', threadIds).order('updated_at', { ascending: false }),
        supabase.from('chat_thread_members').select('thread_id, user_id').in('thread_id', threadIds),
        supabase.from('chat_messages').select('thread_id, body, created_at').in('thread_id', threadIds).order('created_at', { ascending: false }),
      ]);

    const queryError = threadsError || membersError || messagesError;
    if (queryError) {
      setStatus(sanitizeUserFacingError(queryError, 'Community is temporarily unavailable.'));
      return;
    }

    const otherIds = Array.from(
      new Set((memberRows || []).filter((row) => row.user_id !== user.id).map((row) => row.user_id)),
    );
    const { data: profiles, error: profilesError } =
      otherIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, business_name, avatar_url, role').in('id', otherIds)
        : { data: [] as ProfileLite[], error: null };
    if (profilesError) {
      setStatus(sanitizeUserFacingError(profilesError, 'Community is temporarily unavailable.'));
      return;
    }

    const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
    const groupedRecent = new Map<string, { body?: string | null }>();
    (recentMessages || []).forEach((message) => {
      if (!groupedRecent.has(message.thread_id)) groupedRecent.set(message.thread_id, message);
    });

    const list = (threadRows || []).map((thread) => {
      const otherMember = (memberRows || []).find((row) => row.thread_id === thread.id && row.user_id !== user.id);
      return {
        ...thread,
        counterpart: otherMember ? profileMap.get(otherMember.user_id) : null,
        lastMessage: groupedRecent.get(thread.id) || null,
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
    const { data, error } = await supabase.from('chat_messages').select('*').eq('thread_id', threadId).order('created_at');
    if (error) {
      setStatus(sanitizeUserFacingError(error, 'Messages are temporarily unavailable.'));
      return;
    }
    setMessages((data || []) as MessageItem[]);
  };

  const loadDirectory = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, avatar_url, role')
      .in('role', ['merchant', 'affiliate'])
      .limit(80);
    if (error) {
      setStatus(sanitizeUserFacingError(error, 'Community directory is temporarily unavailable.'));
      return;
    }
    setDirectory((data || []) as ProfileLite[]);
  };

  const loadForum = async () => {
    if (!user) return;

    const { data: postRows, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (postsError) {
      setStatus(sanitizeUserFacingError(postsError, 'Forum is temporarily unavailable.'));
      return;
    }

    const basePosts = (postRows || []) as ForumPost[];
    const postIds = basePosts.map((post) => post.id);
    const authorIds = Array.from(new Set(basePosts.map((post) => post.author_id)));

    const [{ data: commentRows, error: commentsError }, { data: reactionRows, error: reactionsError }] = await Promise.all([
      postIds.length
        ? supabase.from('forum_comments').select('*').in('post_id', postIds).order('created_at')
        : Promise.resolve({ data: [] as ForumComment[], error: null }),
      postIds.length
        ? supabase.from('forum_reactions').select('post_id, user_id, reaction').in('post_id', postIds)
        : Promise.resolve({ data: [] as ForumReaction[], error: null }),
    ]);
    const forumQueryError = commentsError || reactionsError;
    if (forumQueryError) {
      setStatus(sanitizeUserFacingError(forumQueryError, 'Forum is temporarily unavailable.'));
      return;
    }

    const typedComments = (commentRows || []) as ForumComment[];
    const typedReactions = (reactionRows || []) as ForumReaction[];
    const commentAuthorIds = Array.from(new Set(typedComments.map((item) => item.author_id)));
    const mentionIds = Array.from(
      new Set(
        [
          ...basePosts.flatMap((post) => post.mention_user_ids || []),
          ...typedComments.flatMap((comment) => comment.mention_user_ids || []),
        ].filter(Boolean),
      ),
    );

    const lookupIds = Array.from(new Set([...authorIds, ...commentAuthorIds, ...mentionIds]));
    const { data: relatedProfiles, error: profilesError } =
      lookupIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, business_name, avatar_url, role').in('id', lookupIds)
        : { data: [] as ProfileLite[], error: null };
    if (profilesError) {
      setStatus(sanitizeUserFacingError(profilesError, 'Forum is temporarily unavailable.'));
      return;
    }

    const profileMap = new Map((relatedProfiles || []).map((item) => [item.id, item as ProfileLite]));

    const reactionsByPost = typedReactions.reduce<Record<string, ForumReaction[]>>((acc, reaction) => {
      acc[reaction.post_id] ||= [];
      acc[reaction.post_id].push(reaction);
      return acc;
    }, {});

    const enrichedPosts = basePosts.map((post) => {
      const reactions = reactionsByPost[post.id] || [];
      return {
        ...post,
        author: profileMap.get(post.author_id) || null,
        mentions: (post.mention_user_ids || []).map((id) => profileMap.get(id)).filter(Boolean) as ProfileLite[],
        likes_count: reactions.filter((item) => item.reaction === 'like').length,
        dislikes_count: reactions.filter((item) => item.reaction === 'dislike').length,
        myReaction: reactions.find((item) => item.user_id === user.id)?.reaction || null,
      };
    });
    setPosts(enrichedPosts);

    const groupedComments = typedComments.reduce<Record<string, ForumComment[]>>((acc, item) => {
      acc[item.post_id] ||= [];
      acc[item.post_id].push({
        ...item,
        author: profileMap.get(item.author_id) || null,
        mentions: (item.mention_user_ids || []).map((id) => profileMap.get(id)).filter(Boolean) as ProfileLite[],
      });
      return acc;
    }, {});
    setComments(groupedComments);
  };

  useEffect(() => {
    if (!user) return;
    loadThreads();
    loadDirectory();
    loadForum();

    const threadChannel = supabase
      .channel(`community:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, loadThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_thread_members', filter: `user_id=eq.${user.id}` }, loadThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, loadForum)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_comments' }, loadForum)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_reactions' }, loadForum)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${selectedThreadId}` },
        () => loadMessages(selectedThreadId),
      )
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

    setBusyKey('start-thread');
    try {
      const result = await communityApi.createThread({
        member_ids: [targetUserId],
        subject: 'Direct conversation',
      });
      setTargetUserId('');
      await loadThreads();
      setSelectedThreadId(result.thread?.id || null);
    } catch (error: unknown) {
      setStatus(sanitizeUserFacingError(error, 'We could not start the conversation right now.'));
    } finally {
      setBusyKey(null);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedThreadId || !messageBody.trim()) return;
    setStatus(null);
    const body = messageBody.trim();
    setMessageBody('');
    setBusyKey('send-message');
    try {
      await communityApi.sendMessage({ thread_id: selectedThreadId, body });
      await loadThreads();
    } catch (error: unknown) {
      setStatus(sanitizeUserFacingError(error, 'We could not send the message right now.'));
      setMessageBody(body);
    } finally {
      setBusyKey(null);
    }
  };

  const createPost = async () => {
    if (!user || !postTitle.trim() || !postBody.trim()) return;
    setStatus(null);

    const validationError = validateCommunityFiles(postFiles);
    if (validationError) {
      setStatus(validationError);
      return;
    }

    setBusyKey('create-post');
    try {
      const uploads = await Promise.all(
        postFiles.map(async (file) => ({
          url: await uploadCommunityMedia(user.id, file),
          type: file.type,
          name: file.name,
          size: file.size,
        })),
      );

      const { error } = await supabase.from('forum_posts').insert({
        author_id: user.id,
        title: postTitle.trim(),
        content: postBody.trim(),
        media: toCommunityMediaPayload(uploads),
        mention_user_ids: mentionedUserIds,
      });
      if (error) {
        throw error;
      }

      setPostTitle('');
      setPostBody('');
      setPostFiles([]);
      setMentionedUserIds([]);
      setStatus('Forum post submitted. It is visible to you immediately and awaits admin moderation.');
      await loadForum();
    } catch (error: unknown) {
      setStatus(sanitizeUserFacingError(error, 'We could not publish the forum post right now.'));
    } finally {
      setBusyKey(null);
    }
  };

  const addComment = async (postId: string) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!user || !body) return;
    setStatus(null);
    const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: user.id, body });
    if (error) {
      setStatus(sanitizeUserFacingError(error, 'We could not add the comment right now.'));
      return;
    }
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    await loadForum();
  };

  const toggleReaction = async (postId: string, reaction: 'like' | 'dislike') => {
    if (!user) return;
    setStatus(null);

    const existing = posts.find((post) => post.id === postId)?.myReaction;
    if (existing === reaction) {
      const { error } = await supabase
        .from('forum_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      if (error) {
        setStatus(sanitizeUserFacingError(error, 'We could not update the reaction right now.'));
        return;
      }
    } else {
      const { error } = await supabase.from('forum_reactions').upsert(
        { post_id: postId, user_id: user.id, reaction },
        { onConflict: 'post_id,user_id' },
      );
      if (error) {
        setStatus(sanitizeUserFacingError(error, 'We could not update the reaction right now.'));
        return;
      }
    }

    await loadForum();
  };

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">Community</h1>
          <p className="text-muted mt-2">
            Real-time direct chat and moderated forum guidance for {role === 'merchant' ? 'merchants' : 'affiliates'}.
          </p>
        </div>
        <div className="flex gap-2 rounded-full border border-white/8 bg-black/30 p-1 text-sm font-bold">
          <button className={`rounded-full px-4 py-2 ${tab === 'dm' ? 'bg-white/10 text-white' : 'text-[#8f98ab]'}`} onClick={() => setTab('dm')}>
            Direct Messages
          </button>
          <button className={`rounded-full px-4 py-2 ${tab === 'forum' ? 'bg-white/10 text-white' : 'text-[#8f98ab]'}`} onClick={() => setTab('forum')}>
            Forum
          </button>
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
                {dmCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.business_name || candidate.full_name}
                  </option>
                ))}
              </select>
              <Button onClick={startThread} className="whitespace-nowrap" disabled={busyKey === 'start-thread'}>
                <Plus size={16} /> {busyKey === 'start-thread' ? 'Starting...' : 'Start'}
              </Button>
            </div>
            <div className="space-y-3">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  className={`w-full rounded-2xl border px-4 py-3 text-left ${selectedThreadId === thread.id ? 'border-white/20 bg-black/30' : 'border-white/8 bg-black/10'}`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
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
                      {message.media_url ? (
                        <a href={message.media_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline underline-offset-4">
                          Open attachment
                        </a>
                      ) : null}
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
              <Button onClick={sendMessage} disabled={busyKey === 'send-message'}>
                <PaperPlaneTilt size={16} /> {busyKey === 'send-message' ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card-surface p-6 space-y-4">
            <div className="text-sm font-bold uppercase tracking-[0.24em] text-[#7e869a]">Post guidance or ask a question</div>
            <input className="input-shell" placeholder="Forum title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            <textarea className="input-shell min-h-[180px]" placeholder="Share a practical question, tip, or lesson for the community." value={postBody} onChange={(e) => setPostBody(e.target.value)} />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setPostFiles(Array.from(e.target.files || []))}
              className="block w-full text-sm text-[#cfd5e1]"
            />
            {postFiles.length > 0 ? <div className="text-sm text-[#cfd5e1]">{postFiles.length} media file(s) ready to upload.</div> : null}
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#7e869a]">Mentions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {mentionCandidates.slice(0, 20).map((candidate) => {
                  const active = mentionedUserIds.includes(candidate.id);
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-[#009A44] text-white' : 'bg-white/5 text-[#cfd5e1]'}`}
                      onClick={() =>
                        setMentionedUserIds((current) =>
                          current.includes(candidate.id)
                            ? current.filter((item) => item !== candidate.id)
                            : [...current, candidate.id],
                        )
                      }
                    >
                      @{candidate.business_name || candidate.full_name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#cdd4e1]">
              <div className="font-bold text-white">Media guidelines</div>
              <ul className="mt-3 space-y-2 text-sm text-[#cdd4e1]">
                {COMMUNITY_MEDIA_GUIDELINES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Button onClick={createPost} disabled={busyKey === 'create-post'}>
              <ChatCircleDots size={16} /> {busyKey === 'create-post' ? 'Publishing...' : 'Publish post'}
            </Button>
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
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${post.status === 'approved' ? 'bg-[#009A44]/15 text-[#009A44]' : 'bg-yellow-500/15 text-yellow-300'}`}>
                    {post.status}
                  </span>
                </div>

                {post.mentions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {post.mentions.map((mention) => (
                      <span key={mention.id} className="rounded-full bg-white/5 px-3 py-1 text-[#cfd5e1]">
                        @{mention.business_name || mention.full_name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-4 text-sm leading-7 text-[#d3d9e4]">{post.content}</p>

                {post.media?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {post.media.map((item) => (
                      <div key={`${post.id}-${item.url}`} className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
                        {item.type === 'video' ? (
                          <video src={item.url} controls className="h-56 w-full object-cover" />
                        ) : (
                          <img src={item.url} alt={post.title} className="h-56 w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${post.myReaction === 'like' ? 'border-[#009A44] bg-[#009A44]/15 text-[#009A44]' : 'border-white/10 text-[#cfd5e1]'}`}
                    onClick={() => toggleReaction(post.id, 'like')}
                  >
                    <ThumbsUp size={16} /> {post.likes_count || 0}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${post.myReaction === 'dislike' ? 'border-[#BB0000] bg-[#BB0000]/15 text-[#ff9f9f]' : 'border-white/10 text-[#cfd5e1]'}`}
                    onClick={() => toggleReaction(post.id, 'dislike')}
                  >
                    <ThumbsDown size={16} /> {post.dislikes_count || 0}
                  </button>
                  <div className="text-xs text-[#8f98ab]">{(comments[post.id] || []).length} comment(s)</div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7e869a]">
                    <Users size={16} /> Responses
                  </div>
                  <div className="space-y-3">
                    {(comments[post.id] || []).map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <div className="text-sm font-bold text-white">{comment.author?.business_name || comment.author?.full_name || 'Member'}</div>
                        {comment.mentions?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {comment.mentions.map((mention) => (
                              <span key={mention.id} className="rounded-full bg-white/5 px-2 py-1 text-[#cfd5e1]">
                                @{mention.business_name || mention.full_name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm text-[#cfd5e1]">{comment.body}</div>
                      </div>
                    ))}
                    {(comments[post.id] || []).length === 0 ? <div className="text-sm text-muted">No responses yet.</div> : null}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <input
                      className="input-shell"
                      placeholder="Add a practical reply..."
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) => setCommentDrafts((current) => ({ ...current, [post.id]: e.target.value }))}
                    />
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
