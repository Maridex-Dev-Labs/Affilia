'use client';

import { useLeaderboard } from '@/lib/hooks/useLeaderboard';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const { rows, userRank, total } = useLeaderboard(user?.id);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weekly Leaderboard</h1>
      <p className="text-muted mt-2">
        Your Rank: {userRank ? `#${userRank}` : '#-'} of {total || 0}
      </p>

      <div className="card-surface p-6 mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Rank</th>
              <th className="py-2">Affiliate</th>
              <th className="py-2">Earnings</th>
              <th className="py-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} className="border-t border-soft">
                <td className="py-3">{row.rank}</td>
                <td className="py-3">{row.name}</td>
                <td className="py-3">KES {row.total}</td>
                <td className="py-3">—</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No leaderboard data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-surface p-6 mt-6">
        <h3 className="text-lg font-bold">This Week&apos;s Prize</h3>
        <p className="text-muted mt-2">Top 3 win KES 2,000 bonus.</p>
      </div>
    </div>
  );
}
