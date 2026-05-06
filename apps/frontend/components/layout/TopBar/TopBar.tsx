'use client';

import { Bell, SignOut, UserCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import BrandLogo, { BrandMark } from '@/components/shared/BrandLogo';

export default function TopBar({ profile }: { profile: any }) {
  const isMerchant = profile?.role === 'merchant';
  const accent = isMerchant ? 'text-[#ff8e8e]' : 'text-[#67e38b]';
  const mode = isMerchant ? 'Merchant Workspace' : 'Affiliate Workspace';

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="border-b border-white/6 bg-[#111827]/88 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark className="hidden h-12 w-12 md:block" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#96a0b5]">{mode}</div>
            <div className="mt-1 text-xl font-black italic text-white">{profile?.business_name || profile?.full_name || 'Affilia Workspace'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70 md:flex">
            <BrandLogo withText={false} markClassName="h-7 w-7" />
            <span><span className={accent}>Live</span> Activity</span>
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white transition hover:border-white/18 hover:bg-white/[0.07]">
            <Bell size={20} weight="duotone" />
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm md:flex">
            <UserCircle size={20} color={isMerchant ? '#ff8e8e' : '#67e38b'} weight="duotone" />
            <span className="font-bold text-white">{profile?.full_name || 'Affilia User'}</span>
          </div>
          <button onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white transition hover:border-white/18 hover:bg-white/[0.07]">
            <SignOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
