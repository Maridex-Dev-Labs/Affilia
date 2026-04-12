'use client';

import { Bell, SignOut, UserCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/lib/hooks/useProfile';

export default function TopBar() {
  const { profile } = useProfile();
  const isMerchant = profile?.role === 'merchant';
  const accent = isMerchant ? 'text-[#BB0000]' : 'text-[#009A44]';
  const mode = isMerchant ? 'Merchant' : 'Affiliate';

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="border-b border-white/8 bg-[#0A0E17]/92 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7e869a]">{mode} Portal</div>
          <div className="mt-1 text-xl font-black italic text-white">{profile?.business_name || profile?.full_name || 'Affilia Workspace'}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-white/8 bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65 md:block">
            <span className={accent}>Live</span> Dashboard
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-[#141A2B] text-white transition hover:border-white/20 hover:bg-white/5">
            <Bell size={20} weight="duotone" />
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-[#141A2B] px-4 py-2 text-sm md:flex">
            <UserCircle size={20} className={accent} weight="duotone" />
            <span className="font-bold text-white">{profile?.full_name || 'Affilia User'}</span>
          </div>
          <button onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-[#141A2B] text-white transition hover:border-[#BB0000]/50 hover:bg-[#BB0000]/10">
            <SignOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
