'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EnvelopeSimple, MapPin, Phone } from '@phosphor-icons/react';
import NavLinks from './NavLinks';
import { PrimaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Navbar() {
  const pathname = usePathname();
  const isPublic = pathname === '/';

  return (
    <header className="sticky top-0 z-50">
      <div className="kenya-flag-gradient px-4 py-1.5 text-[11px] font-semibold text-white md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Phone size={12} /> +254 700 000 000</span>
            <span className="hidden items-center gap-1 sm:flex"><EnvelopeSimple size={12} /> hello<span>@</span>affilia.co.ke</span>
          </div>
          <span className="hidden items-center gap-1 sm:flex"><MapPin size={12} /> Nakuru, KE</span>
        </div>
      </div>
      <div className="border-b border-white/8 bg-[#0A0E17]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo priority markClassName="h-11 w-11" textClassName="text-xl font-black tracking-tight text-white" />
          </Link>
          {isPublic ? <NavLinks /> : <div className="hidden rounded-full border border-white/8 bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 lg:block">Live Platform</div>}
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-semibold text-[#c3cad8] transition hover:text-white md:block" href="/login">
              Login
            </Link>
            <PrimaryButton href="/signup" className="!px-5 !py-2 text-sm">
              Start Free
            </PrimaryButton>
          </div>
        </div>
      </div>
    </header>
  );
}
