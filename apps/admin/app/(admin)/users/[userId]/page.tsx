'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/admin-client';
import { adminApi } from '@/lib/api/admin';

function getAccountControl(profile: any) {
  return profile?.documents?.account_control || {};
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-KE');
}

export default function Page() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [planRecord, setPlanRecord] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId) return;
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(prof);
    const { data: plan } = await supabase
      .from('profile_plan_selections')
      .select('plan_name,plan_code,status,activated_at,expires_at')
      .eq('profile_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setPlanRecord(plan || null);
    if (prof?.role === 'merchant') {
      const { data: esc } = await supabase.from('merchant_escrow').select('*').eq('merchant_id', userId).single();
      const { data: prods } = await supabase.from('products').select('id, title, price_kes, is_active').eq('merchant_id', userId);
      const { data: conv } = await supabase
        .from('conversions')
        .select('id, order_value_kes, commission_earned_kes, platform_fee_kes, status, created_at')
        .eq('merchant_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      setEscrow(esc || null);
      setProducts(prods || []);
      setConversions(conv || []);
    }
    if (prof?.role === 'affiliate') {
      const { data: l } = await supabase
        .from('affiliate_links')
        .select('id, unique_code, clicks, conversions, total_earned_kes, created_at')
        .eq('affiliate_id', userId);
      const { data: conv } = await supabase
        .from('conversions')
        .select('id, order_value_kes, commission_earned_kes, platform_fee_kes, status, created_at')
        .eq('affiliate_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      const { data: pay } = await supabase.from('payouts').select('*').eq('affiliate_id', userId);
      setLinks(l || []);
      setConversions(conv || []);
      setPayouts(pay || []);
    }
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const act = async (kind: 'warn' | 'block' | 'restore' | 'revoke' | 'scheduleDelete' | 'cancelDelete' | 'deleteNow') => {
    if (!profile) return;
    setError(null);
    try {
      if (kind === 'warn') {
        const message = window.prompt('Warning message for this user?');
        if (!message?.trim()) return;
        await adminApi.warnUser(profile.id, { message });
      } else if (kind === 'block') {
        const reason = window.prompt('Reason for blocking this user?');
        if (!reason?.trim()) return;
        await adminApi.blockUser(profile.id, { reason });
      } else if (kind === 'restore') {
        await adminApi.restoreUser(profile.id);
      } else if (kind === 'revoke') {
        const reason = window.prompt('Reason for revoking verification or paid entitlements?');
        if (!reason?.trim()) return;
        await adminApi.revokeUser(profile.id, { reason });
      } else if (kind === 'scheduleDelete') {
        const reason = window.prompt('Reason for scheduling deletion?');
        if (!reason?.trim()) return;
        await adminApi.scheduleUserDeletion(profile.id, { reason });
      } else if (kind === 'cancelDelete') {
        await adminApi.cancelUserDeletion(profile.id);
      } else if (kind === 'deleteNow') {
        const reason = window.prompt('Reason for immediate deletion? This only succeeds when the account has no blockers.');
        if (!reason?.trim()) return;
        await adminApi.deleteUser(profile.id, { reason });
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to update this account.');
    }
  };

  if (!profile) {
    return <div className="text-muted">Loading user...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{profile.full_name || profile.business_name}</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Role</p>
          <p className="font-semibold">{profile.role}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Phone</p>
          <p className="font-semibold">{profile.phone_number || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Created</p>
          <p className="font-semibold">{new Date(profile.created_at).toLocaleString('en-KE')}</p>
        </div>
        <div>
          <p className="text-xs text-muted">XP</p>
          <p className="font-semibold">{profile.xp_points || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Account status</p>
          <p className="font-semibold capitalize">{(getAccountControl(profile).status || 'active').replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Plan expiry</p>
          <p className="font-semibold">{formatDate(planRecord?.expires_at || null)}</p>
        </div>
      </div>

      <div className="card-surface p-6">
        <h3 className="text-lg font-bold">Moderation Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('warn')}>Warn</button>
          {getAccountControl(profile).status === 'blocked' ? (
            <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('restore')}>Restore</button>
          ) : (
            <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => act('block')}>Block</button>
          )}
          <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('revoke')}>Revoke</button>
          {getAccountControl(profile).status === 'scheduled_for_deletion' ? (
            <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('cancelDelete')}>Cancel Deletion</button>
          ) : (
            <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('scheduleDelete')}>Schedule Deletion</button>
          )}
          <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => act('deleteNow')}>Delete Now</button>
        </div>
        {getAccountControl(profile).warning_message ? (
          <p className="mt-4 text-sm text-[#f8d6a4]">Warning: {getAccountControl(profile).warning_message}</p>
        ) : null}
        {getAccountControl(profile).block_reason ? (
          <p className="mt-2 text-sm text-[#f5c2c2]">Block reason: {getAccountControl(profile).block_reason}</p>
        ) : null}
        {getAccountControl(profile).scheduled_for ? (
          <p className="mt-2 text-sm text-[#d4dbe7]">Scheduled deletion: {formatDate(getAccountControl(profile).scheduled_for)}</p>
        ) : null}
      </div>

      {profile.role === 'merchant' && (
        <div className="space-y-6">
          <div className="card-surface p-6">
            <h3 className="text-lg font-bold">Escrow</h3>
            <p className="text-sm text-muted mt-2">Balance: KES {escrow?.balance_kes || 0}</p>
          </div>

          <div className="card-surface p-6 overflow-x-auto">
            <h3 className="text-lg font-bold">Products</h3>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-soft">
                    <td className="py-3">{p.title}</td>
                    <td className="py-3">KES {p.price_kes}</td>
                    <td className="py-3">{p.is_active ? 'Active' : 'Paused'}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-muted">
                      No products yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {profile.role === 'affiliate' && (
        <div className="space-y-6">
          <div className="card-surface p-6 overflow-x-auto">
            <h3 className="text-lg font-bold">Links</h3>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Clicks</th>
                  <th className="py-2">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t border-soft">
                    <td className="py-3">{l.unique_code}</td>
                    <td className="py-3">{l.clicks}</td>
                    <td className="py-3">KES {l.total_earned_kes || 0}</td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-muted">
                      No links yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-surface p-6 overflow-x-auto">
            <h3 className="text-lg font-bold">Payouts</h3>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-soft">
                    <td className="py-3">KES {p.amount_kes}</td>
                    <td className="py-3">{p.status}</td>
                    <td className="py-3">{new Date(p.created_at).toLocaleString('en-KE')}</td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-muted">
                      No payouts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card-surface p-6 overflow-x-auto">
        <h3 className="text-lg font-bold">Recent Conversions</h3>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Amount</th>
              <th className="py-2">Gross</th>
              <th className="py-2">Fee</th>
              <th className="py-2">Net</th>
              <th className="py-2">Status</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {conversions.map((c) => (
              <tr key={c.id} className="border-t border-soft">
                <td className="py-3">KES {c.order_value_kes || 0}</td>
                <td className="py-3">KES {c.commission_earned_kes || 0}</td>
                <td className="py-3">KES {c.platform_fee_kes || 0}</td>
                <td className="py-3">KES {Math.max(0, Number(c.commission_earned_kes || 0) - Number(c.platform_fee_kes || 0))}</td>
                <td className="py-3">{c.status}</td>
                <td className="py-3">{new Date(c.created_at).toLocaleString('en-KE')}</td>
              </tr>
            ))}
            {conversions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-muted">
                  No conversions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
