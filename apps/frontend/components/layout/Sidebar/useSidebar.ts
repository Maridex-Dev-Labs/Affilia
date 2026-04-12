'use client';

import { useUiStore } from '@/lib/stores/ui.store';

export function useSidebar() {
  return useUiStore();
}
