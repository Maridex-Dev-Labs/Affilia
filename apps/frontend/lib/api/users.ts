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
    body: JSON.stringify({ confirmation_text: confirmationText, mode: 'immediate' }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Failed to delete account.');
  }

  return response.json();
}

async function callInternalJson(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed.');
  }

  return response.json();
}

export const usersApi = {
  updateProfile: async (payload: Record<string, unknown>) => {
    try {
      return (await apiClient.patch('/api/users/me', payload)).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (updateError) throw updateError;
      return { status: 'updated' };
    }
  },
  submitMerchantVerification: async (payload: { business_document_path: string }) => {
    try {
      return (await apiClient.post('/api/users/merchant-verification', payload)).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,business_name,phone_number,documents')
        .eq('id', user.id)
        .single();
      if (profileError || !profile || profile.role !== 'merchant') {
        throw new Error('Only merchants can submit business verification.');
      }
      if (!profile.business_name) {
        throw new Error('Save your business name before submitting verification.');
      }
      if (!profile.phone_number) {
        throw new Error('Save your primary phone number before submitting verification.');
      }
      if (!payload.business_document_path?.trim()) {
        throw new Error('Upload your business document before submitting verification.');
      }
      const documents = { ...(profile.documents || {}) } as Record<string, any>;
      documents.registration = payload.business_document_path.trim();
      documents.merchant_verification = {
        ...(documents.merchant_verification || {}),
        business_document_path: payload.business_document_path.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ documents, business_verified: false })
        .eq('id', user.id);
      if (updateError) throw updateError;
      return { status: 'submitted' };
    }
  },
  deleteAccount: async (confirmationText: string) => {
    try {
      return (await apiClient.post('/api/users/delete-account', { confirmation_text: confirmationText, mode: 'immediate' })).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return callInternalDeleteAccount(confirmationText);
    }
  },
  scheduleAccountDeletion: async (confirmationText: string) => {
    try {
      return (await apiClient.post('/api/users/delete-account', { confirmation_text: confirmationText, mode: 'scheduled' })).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return callInternalJson('/api/internal/users/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmation_text: confirmationText, mode: 'scheduled' }),
      });
    }
  },
  cancelAccountDeletion: async () => {
    try {
      return (await apiClient.post('/api/users/cancel-account-deletion')).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return callInternalJson('/api/internal/users/cancel-account-deletion', { method: 'POST' });
    }
  },
  accountDeletionStatus: async () => {
    try {
      return (await apiClient.get('/api/users/account-deletion-status')).data;
    } catch (error) {
      if (!isBackendUnavailableError(error)) throw error;
      return callInternalJson('/api/internal/users/account-deletion-status');
    }
  },
  downloadMyData: async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch('/api/internal/users/export-data', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Failed to prepare your data export.');
    }
    return {
      blob: await response.blob(),
      filename: response.headers.get('x-export-filename') || 'affilia-user-export.zip',
    };
  },
};
