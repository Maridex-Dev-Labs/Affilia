'use client';

import { useState } from 'react';

export function useImpersonation() {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  return { impersonatedUserId, setImpersonatedUserId };
}
