'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: products } = await supabase.from('products').select('id').eq('merchant_id', user.id);
      const ids = (products || []).map((p) => p.id);
      if (!ids.length) return setLinks([]);
      const { data } = await supabase
        .from('affiliate_links')
        .select('affiliate_id, clicks, conversions, total_earned_kes, products(title)')
        .in('product_id', ids);
      setLinks(data || []);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Affiliates</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Affiliate</th>
              <th className="py-2">Product</th>
              <th className="py-2">Clicks</th>
              <th className="py-2">Conversions</th>
              <th className="py-2">Earned</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i} className="border-t border-soft">
                <td className="py-3">{l.affiliate_id}</td>
                <td className="py-3">{l.products?.title}</td>
                <td className="py-3">{l.clicks}</td>
                <td className="py-3">{l.conversions}</td>
                <td className="py-3">KES {l.total_earned_kes}</td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td className="py-6 text-muted" colSpan={5}>
                  No affiliates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
