import { useNotificationStore } from '../stores/notification.store';

export function useNotifications() {
  return useNotificationStore();
}
