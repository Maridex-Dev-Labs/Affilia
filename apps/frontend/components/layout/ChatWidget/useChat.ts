'use client';

import { useChat } from '@/lib/hooks/useChat';

export default function useWidgetChat(channelId: string) {
  return useChat(channelId);
}
