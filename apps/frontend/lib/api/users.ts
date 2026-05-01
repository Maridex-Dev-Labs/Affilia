import { apiClient } from './client';

export const usersApi = {
  deleteAccount: async (confirmationText: string) =>
    (await apiClient.post('/api/users/delete-account', { confirmation_text: confirmationText })).data,
};
