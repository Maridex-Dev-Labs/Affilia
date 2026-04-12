'use client';

import { useAuditLog } from '@/lib/hooks/useAuditLog';

export default function Page() {
  const { logs, loading } = useAuditLog();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Time</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-soft">
                <td className="py-3">{new Date(log.created_at).toLocaleString('en-KE')}</td>
                <td className="py-3">{log.action_type}</td>
                <td className="py-3">
                  {log.target_type} {log.target_id}
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-muted">
                  No audit logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
