'use client';

import { ButtonHTMLAttributes } from 'react';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
};

export function PrimaryButton({
  children,
  className = '',
  disabled,
  loading = false,
  loadingText,
  ...props
}: AdminButtonProps) {
  return (
    <button
      className={`button-primary rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-3 transition disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <KenyanShieldLoader label={loadingText || 'Please wait'} showLabel={false} size="sm" />
          <span>{loadingText || 'Please wait'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
