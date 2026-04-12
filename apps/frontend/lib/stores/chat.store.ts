import { create } from 'zustand';

export const useChatStore = create<{ messages: any[]; add: (m: any) => void }>((set) => ({
  messages: [],
  add: (message) => set((s) => ({ messages: [...s.messages, message] })),
}));
