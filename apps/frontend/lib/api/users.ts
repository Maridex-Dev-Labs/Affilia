import { supabase } from '@/lib/supabase/client';
import { apiClient, isBackendUnavailableError } from './client';

async function callInternalDeleteAccount(confirmationText: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch('/api/internal/users/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ confirmation_text: confirmationText }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Failed to delete account.');
  }

  return response.json();
}

export const usersApi = {
  deleteAccount: async (confirmationText: string) => {
    try {
      return (await apiClient.post('/api/users/delete-account', { confirmation_text: confirmationText })).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return callInternalDeleteAccount(confirmationText);
    }
  },
};
