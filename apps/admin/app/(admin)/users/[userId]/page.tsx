'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(prof);
      if (prof?.role === 'merchant') {
        const { data: esc } = await supabase.from('merchant_escrow').select('*').eq('merchant_id', userId).single();
        const { data: prods } = await supabase.from('products').select('id, title, price_kes, is_active').eq('merchant_id', userId);
        const { data: conv } = await supabase
          .from('conversions')
          .select('id, order_value_kes, commission_earned_kes, status, created_at')
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
          .select('id, commission_earned_kes, status, created_at')
          .eq('affiliate_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        const { data: pay } = await supabase.from('payouts').select('*').eq('affiliate_id', userId);
        setLinks(l || []);
        setConversions(conv || []);
        setPayouts(pay || []);
      }
    };
    load();
  }, [userId]);

  if (!profile) {
    return <div className="text-muted">Loading user...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{profile.full_name || profile.business_name}</h1>
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
              <th className="py-2">Commission</th>
              <th className="py-2">Status</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {conversions.map((c) => (
              <tr key={c.id} className="border-t border-soft">
                <td className="py-3">KES {c.order_value_kes || 0}</td>
                <td className="py-3">KES {c.commission_earned_kes || 0}</td>
                <td className="py-3">{c.status}</td>
                <td className="py-3">{new Date(c.created_at).toLocaleString('en-KE')}</td>
              </tr>
            ))}
            {conversions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
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
