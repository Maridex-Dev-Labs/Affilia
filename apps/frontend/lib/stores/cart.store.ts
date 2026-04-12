import { create } from 'zustand';

export const useCartStore = create<{ favorites: string[]; toggle: (id: string) => void }>((set, get) => ({
  favorites: [],
  toggle: (id) => {
    const favs = get().favorites;
    set({ favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id] });
  },
}));
