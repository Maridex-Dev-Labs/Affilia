'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from './useAdminAuth';

export function useAdminAccess() {
  const { user, loading } = useAdminAuth();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (loading) return;
      if (!user) {
        setAdminUser(null);
        setPermissions([]);
        setAccessLoading(false);
        return;
      }

      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      setAdminUser(adminRecord || null);

      if (!adminRecord) {
        setPermissions([]);
        setAccessLoading(false);
        return;
      }

      if (adminRecord.is_super_admin) {
        const { data: allPermissions } = await supabase.from('admin_permissions').select('code');
        setPermissions((allPermissions || []).map((item) => item.code));
        setAccessLoading(false);
        return;
      }

      const { data: roleLinks } = await supabase
        .from('admin_user_roles')
        .select('role_id')
        .eq('admin_user_id', adminRecord.id);
      const roleIds = (roleLinks || []).map((item) => item.role_id);
      if (roleIds.length === 0) {
        setPermissions([]);
        setAccessLoading(false);
        return;
      }

      const { data: granted } = await supabase
        .from('admin_role_permissions')
        .select('permission_code')
        .in('role_id', roleIds);
      setPermissions(Array.from(new Set((granted || []).map((item) => item.permission_code))));
      setAccessLoading(false);
    };

    load();
  }, [loading, user]);

  const can = useMemo(() => (permission: string) => permissions.includes(permission), [permissions]);

  return { adminUser, permissions, can, loading: accessLoading || loading };
}
