'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import BrandLogo from '@/components/shared/BrandLogo';

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
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-8">
      <div className="max-w-3xl w-full surface-panel p-8 text-center">
        <BrandLogo className="mb-6 justify-center" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#95a0b5]">Getting started</div>
        <h1 className="mt-3 text-4xl font-black italic">Choose your role</h1>
        <p className="text-muted mt-3">Select how you will use Affilia. You can continue setup immediately after this step.</p>
        <div className="grid gap-4 mt-8 md:grid-cols-2">
          <button className="soft-panel p-6 text-left hover:bg-white/[0.05]" onClick={() => setRole('merchant')}>
            <h3 className="text-xl font-bold">Merchant</h3>
            <p className="text-sm text-muted mt-2">List products, manage sales flow, and run affiliate-powered growth.</p>
          </button>
          <button className="soft-panel p-6 text-left hover:bg-white/[0.05]" onClick={() => setRole('affiliate')}>
            <h3 className="text-xl font-bold">Affiliate</h3>
            <p className="text-sm text-muted mt-2">Promote products, generate tracked links, and grow commission earnings.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
