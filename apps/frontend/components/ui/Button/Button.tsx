'use client';

import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/helpers';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';
import { ButtonSize, ButtonVariant } from './Button.types';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold italic tracking-wide text-white transition-all disabled:cursor-not-allowed disabled:opacity-50';

const sizes: Record<ButtonSize, string> = {
  default: 'px-8 py-3.5 text-sm',
  compact: 'px-4 py-2 text-xs',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'bg-transparent border-2 border-white/12 text-white hover:bg-white/5 hover:border-white/25',
  success: 'bg-[#009A44] text-white shadow-[0_0_20px_rgba(0,154,68,0.28)] hover:shadow-[0_0_30px_rgba(0,154,68,0.45)]',
  danger: 'bg-[#BB0000] text-white shadow-[0_0_20px_rgba(187,0,0,0.28)] hover:shadow-[0_0_30px_rgba(187,0,0,0.45)]',
  ghost: 'bg-transparent text-white/75 hover:bg-white/5 hover:text-white',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: string;
  loading?: boolean;
  loadingText?: string;
  size?: ButtonSize;
};

export default function Button({
  variant = 'primary',
  className,
  href,
  children,
  loading = false,
  loadingText,
  size = 'default',
  onClick,
  disabled,
  ...props
}: ButtonProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const isBusy = loading || isNavigating;
  const classes = cn(base, sizes[size], variants[variant], className);

  const content = isBusy ? (
    <>
      <KenyanShieldLoader showLabel={false} size="sm" />
      <span>{loadingText || 'Processing...'}</span>
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <motion.div whileHover={isBusy ? {} : { scale: 1.03 }} whileTap={isBusy ? {} : { scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
        <Link
          aria-disabled={isBusy}
          className={classes}
          href={href}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (isBusy) {
              event.preventDefault();
              return;
            }
            setIsNavigating(true);
          }}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={disabled || isBusy ? {} : { scale: 1.03 }}
      whileTap={disabled || isBusy ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      <button
        className={classes}
        disabled={disabled || isBusy}
        onClick={async (event) => {
          if (!onClick) return;
          const result = onClick(event) as unknown;
          if (typeof result === 'object' && result !== null && 'then' in result) {
            setIsNavigating(true);
            try {
              await result;
            } finally {
              setIsNavigating(false);
            }
          }
        }}
        {...props}
      >
        {content}
      </button>
    </motion.div>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
