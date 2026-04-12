'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();

  const setRole = async (role: 'merchant' | 'affiliate') => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? '',
      role,
      onboarding_complete: false,
    });
    router.push(role === 'merchant' ? '/onboarding/merchant-setup' : '/onboarding/affiliate-setup');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-3xl w-full card-surface p-8 text-center">
        <h1 className="text-3xl font-bold">Choose Your Role</h1>
        <p className="text-muted mt-2">Select how you will use Affilia.</p>
        <div className="grid gap-6 mt-8 md:grid-cols-2">
          <button
            className="border border-white/20 rounded-2xl p-6 text-left hover:bg-white/5"
            onClick={() => setRole('merchant')}
          >
            <h3 className="text-xl font-bold">Merchant</h3>
            <p className="text-sm text-muted mt-2">List products and manage affiliates.</p>
          </button>
          <button
            className="border border-white/20 rounded-2xl p-6 text-left hover:bg-white/5"
            onClick={() => setRole('affiliate')}
          >
            <h3 className="text-xl font-bold">Affiliate</h3>
            <p className="text-sm text-muted mt-2">Promote products and earn commissions.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
