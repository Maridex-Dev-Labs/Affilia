'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { affiliateNav, merchantNav } from '@/lib/config/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const items = profile?.role === 'merchant' ? merchantNav : affiliateNav;
  const accent = profile?.role === 'merchant' ? 'text-[#BB0000]' : 'text-[#009A44]';
  const rail = profile?.role === 'merchant' ? 'bg-[#BB0000]' : 'bg-[#009A44]';

  return (
    <aside className="custom-scrollbar hidden h-[calc(100vh-95px)] w-[280px] shrink-0 overflow-y-auto border-r border-white/8 bg-[#141A2B]/80 pt-6 lg:sticky lg:top-[95px] lg:flex lg:flex-col">
      <div className="flex flex-1 flex-col gap-1 px-3 pb-8">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-4 rounded-xl p-3 text-sm font-bold transition-colors ${
                active ? 'bg-black/40 text-white' : 'text-[#8f98ab] hover:bg-white/5 hover:text-white'
              }`}
            >
              {active ? <span className={`absolute inset-y-0 left-0 w-1 rounded-r-md ${rail}`} /> : null}
              <Icon size={20} className={`ml-1 ${active ? accent : ''}`} weight={active ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="group mt-auto flex items-center gap-4 rounded-xl p-3 text-sm font-bold text-[#8f98ab] transition-colors hover:bg-[#BB0000]/10 hover:text-white"
        >
          <SignOut size={20} className="ml-1 group-hover:text-[#BB0000]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
