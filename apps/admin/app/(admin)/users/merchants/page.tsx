'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'merchant').then(({ data }) => setUsers(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Merchants</h1>
      <div className="card-surface p-6">
        {users.map((u) => (
          <div key={u.id} className="border-b border-soft py-3">
            {u.business_name || u.full_name} — {u.phone_number}
          </div>
        ))}
        {users.length === 0 && <div className="text-muted">No merchants yet.</div>}
      </div>
    </div>
  );
}
