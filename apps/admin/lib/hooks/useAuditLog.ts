'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export function useAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, []);

  return { logs, loading };
}
