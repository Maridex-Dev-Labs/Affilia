import { create } from 'zustand';

export const useToastStore = create<{ items: any[]; push: (t: any) => void }>((set) => ({
  items: [],
  push: (toast) => set((s) => ({ items: [...s.items, toast] })),
}));
