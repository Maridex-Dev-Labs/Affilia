'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export function useChat(channelId: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`chat:${channelId}`).on('broadcast', { event: 'message' }, (payload) => {
      setMessages((m) => [...m, payload.payload]);
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const send = async (message: any) => {
    await supabase.channel(`chat:${channelId}`).send({ type: 'broadcast', event: 'message', payload: message });
  };

  return { messages, send };
}
