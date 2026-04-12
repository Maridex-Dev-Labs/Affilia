import { create } from 'zustand';

export const useNotificationStore = create<{ items: any[]; add: (n: any) => void }>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [item, ...s.items] })),
}));
