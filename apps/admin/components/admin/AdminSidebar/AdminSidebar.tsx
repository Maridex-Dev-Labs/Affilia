'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Broadcast,
  ChartBar,
  Certificate,
  FileText,
  Gear,
  GraduationCap,
  House,
  Megaphone,
  QrCode,
  ShieldWarning,
  SignOut,
  Sparkle,
  Users,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';
import BrandLogo from '@/components/shared/BrandLogo';

const nav = [
  { label: 'Command Center', href: '/overview', icon: House, permission: 'dashboard.view' },
  { label: 'Verify Queue', href: '/verifications', icon: ShieldWarning, permission: 'merchant.verify' },
  { label: 'Deposit Approvals', href: '/deposits', icon: QrCode, permission: 'deposit.approve' },
  { label: 'Payout Sweeps', href: '/sweeps', icon: Broadcast, permission: 'payout.manage' },
  { label: 'User Mgmt', href: '/users', icon: Users, permission: 'user.manage' },
  { label: 'Moderation', href: '/moderation', icon: Sparkle, permission: 'product.review' },
  { label: 'Contracts', href: '/contracts', icon: Certificate, permission: 'legal.review' },
  { label: 'Academy', href: '/academy', icon: GraduationCap, permission: 'academy.manage' },
  { label: 'Audit Log', href: '/audit', icon: FileText, permission: 'audit.view' },
  { label: 'Analytics', href: '/analytics', icon: ChartBar, permission: 'dashboard.view' },
  { label: 'Broadcasts', href: '/broadcast', icon: Megaphone, permission: 'broadcast.manage' },
  { label: 'Platform Config', href: '/settings', icon: Gear, permission: 'admin.manage' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { can } = useAdminAccess();
  const visibleNav = nav.filter((item) => can(item.permission));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="custom-scrollbar hidden h-screen w-[290px] shrink-0 overflow-y-auto border-r border-white/8 bg-[linear-gradient(180deg,rgba(20,26,43,0.94),rgba(10,14,23,0.99))] pt-6 lg:sticky lg:top-0 lg:flex lg:flex-col"
    >
      <div className="px-4 pb-6">
        <div className="rounded-[1.6rem] border border-[#BB0000]/20 bg-black/40 p-5">
          <BrandLogo markClassName="h-12 w-12" textClassName="text-2xl font-black italic text-white" priority />
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#BB0000]">Admin</div>
          <p className="mt-2 text-sm text-[#8891a6]">Separated access by role and operational responsibility.</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-8">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <motion.div key={item.href} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}>
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-4 rounded-xl p-3 text-sm font-bold transition-colors ${active ? 'bg-black/50 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]' : 'text-[#8f98ab] hover:bg-white/5 hover:text-white'}`}
            >
              {active ? <span className="absolute inset-y-0 left-0 w-1 rounded-r-md bg-[#BB0000]" /> : null}
              <Icon size={20} className={`ml-1 ${active ? 'text-[#BB0000]' : ''}`} weight={active ? 'fill' : 'regular'} />
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
      </nav>
    </motion.aside>
  );
}
