import { useGamificationStore } from '../stores/gamification.store';

export function useXP() {
  return useGamificationStore();
}
