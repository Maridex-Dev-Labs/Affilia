'use client';

type KenyanShieldLoaderProps = {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

const sizes = {
  sm: { shell: 'h-6 w-6', shield: 'h-4 w-3' },
  md: { shell: 'h-16 w-16', shield: 'h-10 w-8' },
  lg: { shell: 'h-24 w-24', shield: 'h-14 w-11' },
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
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background:
              'conic-gradient(from 0deg, #000000 0deg, #000000 70deg, #bb0000 70deg, #bb0000 155deg, #ffffff 155deg, #ffffff 205deg, #009a44 205deg, #009a44 290deg, #000000 290deg, #000000 360deg)',
          }}
        />
        <div className="absolute inset-[5px] rounded-full bg-[var(--kenya-navy)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative ${current.shield}`}
            style={{ clipPath: 'polygon(50% 0%, 90% 18%, 82% 72%, 50% 100%, 18% 72%, 10% 18%)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black via-red-700 to-green-600" />
            <div className="absolute inset-x-[36%] top-[14%] bottom-[14%] bg-white/95" />
            <div className="absolute inset-x-[18%] top-[33%] h-[10%] bg-white/90" />
            <div className="absolute inset-x-[18%] bottom-[33%] h-[10%] bg-white/90" />
          </div>
        </div>
      </div>
      {showLabel ? <p className="text-sm tracking-[0.25em] uppercase text-white/70">{label}</p> : null}
    </div>
  );
}
