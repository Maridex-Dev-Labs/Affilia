'use client';

import { BrandMark } from '@/components/shared/BrandLogo';

type KenyanShieldLoaderProps = {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

const sizes = {
  sm: {
    shell: 'h-8 w-8',
    core: 'h-4 w-4',
    halo: 'h-6 w-6',
    label: 'text-[10px] tracking-[0.22em]',
  },
  md: {
    shell: 'h-20 w-20',
    core: 'h-9 w-9',
    halo: 'h-14 w-14',
    label: 'text-sm tracking-[0.25em]',
  },
  lg: {
    shell: 'h-28 w-28',
    core: 'h-12 w-12',
    halo: 'h-20 w-20',
    label: 'text-base tracking-[0.28em]',
  },
};

export default function KenyanShieldLoader({
  className = '',
  label = 'Loading Affilia...',
  size = 'md',
  showLabel = true,
}: KenyanShieldLoaderProps) {
  const current = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`relative ${current.shell}`}>
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(0,154,68,0.14),transparent_42%)] blur-[3px]" />
        <div className="absolute inset-0 rounded-full border border-white/8 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-[10%] rounded-full border border-transparent border-t-[#BB0000]/90 border-r-[#009A44]/85 animate-[spin_2.8s_linear_infinite_reverse]" />
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.04] ${current.halo} animate-pulse`} />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative ${current.core}`}>
            <div className="absolute inset-0 rounded-[38%] bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))] shadow-[0_14px_35px_rgba(0,0,0,0.35)] rotate-45" />
            <div className="absolute inset-[16%] rounded-[34%] bg-[linear-gradient(145deg,#141A2B,#0A0E17)] rotate-45 border border-white/10" />
            <div className="absolute inset-[12%] flex items-center justify-center">
              <BrandMark className="h-full w-full" priority />
            </div>
          </div>
        </div>
      </div>

      {showLabel ? (
        <p className={`font-semibold uppercase text-white/68 ${current.label}`}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
