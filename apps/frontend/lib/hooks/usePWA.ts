'use client';

import { useEffect, useState } from 'react';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  return { canInstall };
}
