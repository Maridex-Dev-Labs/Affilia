'use client';

import { useEffect, useState } from 'react';
import QRCode from '@/components/shared/QRCode/QRCode';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('affiliate_links')
      .select('id, unique_code, clicks, conversions, total_earned_kes, products(title)')
      .eq('affiliate_id', user.id)
      .then(({ data }) => setLinks(data || []));
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Tracking Links</h1>
      <div className="card-surface p-6 mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Product</th>
              <th className="py-2">Link Code</th>
              <th className="py-2">Clicks</th>
              <th className="py-2">Conv.</th>
              <th className="py-2">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-t border-soft">
                <td className="py-3">{link.products?.title}</td>
                <td className="py-3">{link.unique_code}</td>
                <td className="py-3">{link.clicks}</td>
                <td className="py-3">{link.conversions}</td>
                <td className="py-3">KES {link.total_earned_kes}</td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-muted">
                  No links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-surface p-6 mt-6">
        <h3 className="text-lg font-bold">Quick QR</h3>
        <p className="text-muted text-sm mt-2">Share your top link instantly.</p>
        <div className="mt-4">
          <QRCode value={`https://affilia.vercel.app/r/${links[0]?.unique_code || ''}`} />
        </div>
      </div>
    </div>
  );
}
