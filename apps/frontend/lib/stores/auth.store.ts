import { create } from 'zustand';

export const useAuthStore = create<{ user: any; setUser: (u: any) => void }>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
