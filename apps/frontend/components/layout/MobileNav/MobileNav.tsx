'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { List, X } from '@phosphor-icons/react';
import type { NavItem } from '@/lib/config/navigation';

type MobileNavProps = {
  items: NavItem[];
  pathname: string;
  profile: any;
};

export default function MobileNav({ items, pathname, profile }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const accent = profile?.role === 'merchant' ? 'text-[#BB0000]' : 'text-[#009A44]';
  const primaryItems = useMemo(() => items.slice(0, 4), [items]);

  return (
    <>
      {open ? <button className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Close mobile menu" /> : null}
      {open ? (
        <div className="fixed inset-x-4 bottom-24 z-50 rounded-[1.75rem] border border-white/10 bg-[#141A2B] p-4 shadow-2xl lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#7e869a]">All Sections</div>
              <button className="rounded-full border border-white/10 p-2 text-white" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${active ? 'border-white/20 bg-black/40 text-white' : 'border-white/8 bg-black/20 text-[#9aa2b5]'}`}
                  >
                    <span className={active ? 'scale-110' : ''}>
                      <Icon size={18} weight={active ? 'fill' : 'regular'} color={active ? (profile?.role === 'merchant' ? '#BB0000' : '#009A44') : undefined} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-white/8 bg-[#141A2B]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-[64px] flex-col items-center p-2 ${active ? accent : 'text-[#6d7587]'}`}>
              <span className={active ? 'scale-110' : ''}>
                <Icon size={24} weight={active ? 'fill' : 'regular'} />
              </span>
              <span className="mt-1 text-[10px] font-bold">{item.shortLabel || item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className={`flex min-w-[64px] flex-col items-center p-2 ${open ? accent : 'text-[#6d7587]'}`}>
          <span className={open ? 'scale-110' : ''}>
            <List size={24} weight={open ? 'fill' : 'regular'} />
          </span>
          <span className="mt-1 text-[10px] font-bold">More</span>
        </button>
      </nav>
    </>
  );
}
