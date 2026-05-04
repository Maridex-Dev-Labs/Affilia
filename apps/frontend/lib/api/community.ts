import { apiClient, isBackendUnavailableError } from './client';
import { supabase } from '@/lib/supabase/client';

type CreateThreadPayload = {
  member_ids: string[];
  subject?: string;
};

type CreateMessagePayload = {
  thread_id: string;
  body: string;
  media_url?: string | null;
};

async function fallbackCreateThread(payload: CreateThreadPayload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');

  const { data: thread, error: threadError } = await supabase
    .from('chat_threads')
    .insert({ created_by: user.id, subject: payload.subject || null })
    .select('*')
    .single();

  if (threadError || !thread) {
    throw new Error(threadError?.message || 'Failed to start conversation.');
  }

  if (payload.member_ids.length > 0) {
    const membershipRows = payload.member_ids.map((memberId) => ({ thread_id: thread.id, user_id: memberId }));
    const { error: memberError } = await supabase.from('chat_thread_members').insert(membershipRows);
    if (memberError) {
      throw new Error(memberError.message);
    }
  }

  return { thread };
}

async function fallbackSendMessage(payload: CreateMessagePayload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: payload.thread_id,
      sender_id: user.id,
      body: payload.body,
      media_url: payload.media_url || null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', payload.thread_id);

  return { message: data };
}

async function fallbackDeleteMessage(messageId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

async function fallbackDeleteThread(threadId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');

  const { data: membership, error: membershipError } = await supabase
    .from('chat_thread_members')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error(membershipError?.message || 'You no longer have access to this conversation.');
  }

  const { error } = await supabase.from('chat_threads').delete().eq('id', threadId);
  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export const communityApi = {
  createThread: async (payload: CreateThreadPayload) => {
    try {
      return (await apiClient.post('/api/chat/threads', payload)).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return fallbackCreateThread(payload);
      }
      throw error;
    }
  },
  sendMessage: async (payload: CreateMessagePayload) => {
    try {
      return (await apiClient.post('/api/chat/messages', payload)).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return fallbackSendMessage(payload);
      }
      throw error;
    }
  },
  deleteMessage: async (messageId: string) => {
    try {
      return (await apiClient.delete(`/api/chat/messages/${messageId}`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return fallbackDeleteMessage(messageId);
      }
      throw error;
    }
  },
  deleteThread: async (threadId: string) => {
    try {
      return (await apiClient.delete(`/api/chat/threads/${threadId}`)).data;
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return fallbackDeleteThread(threadId);
      }
      throw error;
    }
  },
};
