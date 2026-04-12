import { create } from 'zustand';

export const useGamificationStore = create<{ xp: number; setXp: (v: number) => void }>((set) => ({
  xp: 0,
  setXp: (xp) => set({ xp }),
}));
