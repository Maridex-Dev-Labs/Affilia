import { useToastStore } from './toast.store';

export function useToast() {
  return useToastStore();
}
