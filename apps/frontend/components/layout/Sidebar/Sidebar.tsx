'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { affiliateNav, merchantNav } from '@/lib/config/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const items = profile?.role === 'merchant' ? merchantNav : affiliateNav;
  const accent = profile?.role === 'merchant' ? 'text-[#BB0000]' : 'text-[#009A44]';
  const rail = profile?.role === 'merchant' ? 'bg-[#BB0000]' : 'bg-[#009A44]';

  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="custom-scrollbar hidden h-[calc(100vh-95px)] w-[288px] shrink-0 overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,rgba(20,26,43,0.94),rgba(10,14,23,0.98))] pt-6 lg:sticky lg:top-[95px] lg:flex lg:flex-col"
    >
      <div className="px-4 pb-6">
        <div className="rounded-[1.6rem] border border-white/8 bg-black/35 p-5">
          <BrandLogo markClassName="h-12 w-12" textClassName="text-2xl font-black italic text-white" />
          <p className="mt-3 text-sm text-[#8891a6]">Performance, payouts, products, and communication in one workspace.</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-8">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <motion.div key={item.href} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}>
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-4 rounded-xl p-3 text-sm font-bold transition-colors ${
                active ? 'bg-black/50 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]' : 'text-[#8f98ab] hover:bg-white/5 hover:text-white'
              }`}
            >
              {active ? <span className={`absolute inset-y-0 left-0 w-1 rounded-r-md ${rail}`} /> : null}
              <Icon size={20} className={`ml-1 ${active ? accent : ''}`} weight={active ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
            </motion.div>
          );
        })}
        <motion.button
          whileHover={{ x: 4 }}
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="group mt-auto flex items-center gap-4 rounded-xl p-3 text-sm font-bold text-[#8f98ab] transition-colors hover:bg-[#BB0000]/10 hover:text-white"
        >
          <SignOut size={20} className="ml-1 group-hover:text-[#BB0000]" />
          <span>Logout</span>
        </motion.button>
      </div>
    </motion.aside>
  );
}
