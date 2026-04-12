import { supabase } from '@/lib/supabase/admin-client';

export async function logAdminAction(action_type: string, target_type?: string, target_id?: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from('admin_audit_log').insert({
    admin_id: data.user?.id,
    action_type,
    target_type,
    target_id,
  });
}
