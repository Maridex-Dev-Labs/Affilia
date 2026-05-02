'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { affiliateNav, merchantNav } from '@/lib/config/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { usePlanAccess } from '@/lib/hooks/usePlanAccess';

export default function MobileNav() {
  const pathname = usePathname();
  const safePathname = pathname ?? '';
  const { profile } = useProfile();
  const { canAccessPath } = usePlanAccess();
  const [open, setOpen] = useState(false);
  const items = (profile?.role === 'merchant' ? merchantNav : affiliateNav).filter((item) => canAccessPath(item.href));
  const accent = profile?.role === 'merchant' ? 'text-[#BB0000]' : 'text-[#009A44]';
  const primaryItems = useMemo(() => items.slice(0, 4), [items]);

  return (
    <>
      <AnimatePresence>
        {open ? <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Close mobile menu" /> : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-4 bottom-24 z-50 rounded-[1.75rem] border border-white/10 bg-[#141A2B] p-4 shadow-2xl lg:hidden"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#7e869a]">All Sections</div>
              <button className="rounded-full border border-white/10 p-2 text-white" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const Icon = item.icon;
                const active = safePathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${active ? 'border-white/20 bg-black/40 text-white' : 'border-white/8 bg-black/20 text-[#9aa2b5]'}`}
                  >
                    <Icon size={18} weight={active ? 'fill' : 'regular'} className={active ? accent : ''} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-white/8 bg-[#141A2B]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = safePathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-[64px] flex-col items-center p-2 ${active ? accent : 'text-[#6d7587]'}`}>
              <Icon size={24} weight={active ? 'fill' : 'regular'} className={active ? 'scale-110' : ''} />
              <span className="mt-1 text-[10px] font-bold">{item.shortLabel || item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className={`flex min-w-[64px] flex-col items-center p-2 ${open ? accent : 'text-[#6d7587]'}`}>
          <List size={24} weight={open ? 'fill' : 'regular'} className={open ? 'scale-110' : ''} />
          <span className="mt-1 text-[10px] font-bold">More</span>
        </button>
      </nav>
    </>
  );
}
