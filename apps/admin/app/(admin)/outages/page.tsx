'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

const badgeStyles: Record<string, string> = {
  open: 'bg-[#BB0000]/15 text-[#ffb0b0] border-[#BB0000]/20',
  investigating: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/20',
  resolved: 'bg-[#009A44]/15 text-[#9af2b8] border-[#009A44]/20',
  ignored: 'bg-white/10 text-white border-white/10',
};

export default function OutagesPage() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setStatus(null);
    const { data, error } = await supabase
      .from('backend_outage_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setStatus(error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!accessLoading && can('system.outage.view')) {
      load();
    }
  }, [accessLoading, can]);

  const updateStatus = async (id: string, nextStatus: 'investigating' | 'resolved' | 'ignored') => {
    setBusyId(id);
    setStatus(null);
    const { error } = await supabase
      .from('backend_outage_events')
      .update({ status: nextStatus, resolved_at: nextStatus === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) {
      setStatus(error.message);
    } else {
      await load();
    }
    setBusyId(null);
  };

  if (!accessLoading && !can('system.outage.view')) {
    return <div className="card-surface p-6 text-sm text-[#d8deea]">You do not have access to outage operations.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">Backend Outages</h1>
          <p className="mt-2 text-sm text-muted">Admin-only queue of backend availability failures captured from privileged operations.</p>
        </div>
        <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white" onClick={load}>Refresh</button>
      </div>

      {status ? <div className="card-surface p-4 text-sm text-[#d8deea]">{status}</div> : null}

      <div className="space-y-4">
        {loading ? <div className="card-surface p-6 text-sm text-muted">Loading outage queue...</div> : null}
        {!loading && items.length === 0 ? <div className="card-surface p-6 text-sm text-muted">No outage events recorded.</div> : null}
        {items.map((item) => (
          <div key={item.id} className="card-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">{item.source_app} · {item.method || 'REQUEST'}</div>
                <h2 className="mt-2 text-xl font-bold text-white">{item.request_path || 'Unknown endpoint'}</h2>
                <p className="mt-2 text-sm text-[#d8deea]">{item.error_message}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${badgeStyles[item.status] || badgeStyles.open}`}>{item.status}</span>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-[#8f98ab] md:grid-cols-4">
              <div>Environment: {item.environment || 'unknown'}</div>
              <div>Seen: {new Date(item.created_at).toLocaleString('en-KE')}</div>
              <div>Surface: {item.surface || 'admin'}</div>
              <div>Origin: {item.origin || '—'}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'investigating')} className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60">Investigating</button>
              <button disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'resolved')} className="rounded-full bg-[#009A44] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Resolve</button>
              <button disabled={busyId === item.id} onClick={() => updateStatus(item.id, 'ignored')} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Ignore</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
