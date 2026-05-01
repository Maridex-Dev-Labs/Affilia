import Image from 'next/image';

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  withText?: boolean;
  priority?: boolean;
};

export function BrandMark({ className = '', priority = false }: Pick<BrandLogoProps, 'className' | 'priority'>) {
  return (
    <div className={`relative shrink-0 ${className || 'h-10 w-10'}`}>
      <Image
        src="/images/logo/affilia-mark.png"
        alt="Affilia logo"
        fill
        priority={priority}
        sizes="64px"
        className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}

export default function BrandLogo({
  className = '',
  markClassName = 'h-10 w-10',
  textClassName = 'text-xl font-black tracking-tight text-white',
  withText = true,
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark className={markClassName} priority={priority} />
      {withText ? <span className={textClassName}>Affilia</span> : null}
    </div>
  );
}
