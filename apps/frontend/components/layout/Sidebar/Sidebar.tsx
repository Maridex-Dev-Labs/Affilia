'use client';

import Link from 'next/link';
import { SignOut } from '@phosphor-icons/react';
import type { NavItem } from '@/lib/config/navigation';
import { supabase } from '@/lib/supabase/client';
import BrandLogo from '@/components/shared/BrandLogo';

type SidebarProps = {
  activePlanCode: string | null | undefined;
  isAffiliateVerified: boolean;
  items: NavItem[];
  pathname: string;
  profile: any;
};

export default function Sidebar({ activePlanCode, isAffiliateVerified, items, pathname, profile }: SidebarProps) {
  const rail = profile?.role === 'merchant' ? 'bg-[#ff8e8e]' : 'bg-[#67e38b]';

  return (
    <aside className="custom-scrollbar hidden h-[calc(100vh-95px)] w-[292px] shrink-0 overflow-y-auto border-r border-white/6 bg-[linear-gradient(180deg,rgba(24,31,48,0.94),rgba(14,20,32,0.98))] pt-5 lg:sticky lg:top-[95px] lg:flex lg:flex-col">
      <div className="px-4 pb-5">
        <div className="soft-panel p-5">
          <BrandLogo markClassName="h-12 w-12" textClassName="text-2xl font-black italic text-white" />
          <p className="mt-3 text-sm text-[#a5aec0]">
            {profile?.role === 'affiliate' && !isAffiliateVerified
              ? 'Complete verification to unlock link sharing, payouts, and the full operating workspace.'
              : !activePlanCode
                ? 'Choose a plan in Settings to unlock more tools and higher operating limits.'
                : 'Sales, payouts, products, and conversations are organized here in one operating workspace.'}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-8">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                active ? 'bg-white/[0.06] text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]' : 'text-[#a6afc0] hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {active ? <span className={`absolute inset-y-2 left-0 w-1 rounded-r-md ${rail}`} /> : null}
              <Icon size={19} color={active ? (profile?.role === 'merchant' ? '#ff8e8e' : '#67e38b') : undefined} weight={active ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="group mt-auto flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold text-[#a6afc0] transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <SignOut size={20} color="#ff8e8e" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
