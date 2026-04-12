'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [counts, setCounts] = useState({ products: 0, forum: 0, deposits: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: products } = await supabase.from('products').select('id').eq('is_active', false);
      const { data: forum } = await supabase.from('forum_posts').select('id').eq('status', 'pending');
      const { data: deposits } = await supabase.from('deposit_requests').select('id').eq('status', 'pending');
      setCounts({
        products: (products || []).length,
        forum: (forum || []).length,
        deposits: (deposits || []).length,
      });
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Moderation</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link className="card-surface p-5 block" href="/moderation/products">
          <p className="text-sm text-muted">Products Pending Review</p>
          <div className="text-2xl font-bold mt-2">{counts.products}</div>
        </Link>
        <Link className="card-surface p-5 block" href="/moderation/forum">
          <p className="text-sm text-muted">Forum Posts Pending</p>
          <div className="text-2xl font-bold mt-2">{counts.forum}</div>
        </Link>
        <Link className="card-surface p-5 block" href="/deposits">
          <p className="text-sm text-muted">Pending Deposits</p>
          <div className="text-2xl font-bold mt-2">{counts.deposits}</div>
        </Link>
      </div>
    </div>
  );
}
