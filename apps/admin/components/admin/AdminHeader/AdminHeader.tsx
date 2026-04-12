'use client';

import { Bell, ShieldCheck, SignOut } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/admin-client';

export default function AdminHeader() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="border-b border-white/8 bg-[#0A0E17]/92 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#BB0000]">Super Admin</div>
          <div className="mt-1 text-xl font-black italic text-white">Platform Command Center</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[#BB0000]/20 bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70 md:flex">
            <ShieldCheck size={18} className="text-[#BB0000]" weight="duotone" />
            Production Access
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-[#141A2B] text-white transition hover:border-white/20 hover:bg-white/5">
            <Bell size={20} weight="duotone" />
          </button>
          <button onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-[#141A2B] text-white transition hover:border-[#BB0000]/50 hover:bg-[#BB0000]/10">
            <SignOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
