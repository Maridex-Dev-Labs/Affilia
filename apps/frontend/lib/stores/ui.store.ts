import { create } from 'zustand';

export const useUiStore = create<{ sidebarOpen: boolean; toggle: () => void }>((set) => ({
  sidebarOpen: true,
  toggle: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
