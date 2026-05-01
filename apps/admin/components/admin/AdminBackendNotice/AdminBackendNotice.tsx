'use client';

import { useEffect, useState } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';

type OutageState = {
  message: string;
  timestamp: string;
} | null;

const STORAGE_KEY = 'affilia:admin:backend-outage';

export default function AdminBackendNotice() {
  const [outage, setOutage] = useState<OutageState>(null);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setOutage(raw ? JSON.parse(raw) : null);
      } catch {
        setOutage(null);
      }
    };

    sync();
    window.addEventListener('affilia:admin:backend-outage', sync as EventListener);
    return () => window.removeEventListener('affilia:admin:backend-outage', sync as EventListener);
  }, []);

  if (!outage) return null;

  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-[1.4rem] border border-[#BB0000]/30 bg-[#BB0000]/10 px-5 py-4 text-sm text-white/85">
      <div className="flex items-start gap-3">
        <WarningCircle size={20} className="mt-0.5 shrink-0 text-[#ff8d8d]" weight="fill" />
        <div>
          <div className="font-bold text-white">Backend service degraded</div>
          <div className="mt-1">{outage.message}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
            last seen {new Date(outage.timestamp).toLocaleString('en-KE')}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          window.localStorage.removeItem(STORAGE_KEY);
          setOutage(null);
        }}
        className="rounded-full border border-white/10 p-2 text-white/60 hover:bg-white/5 hover:text-white"
        aria-label="Dismiss backend notice"
      >
        <X size={16} />
      </button>
    </div>
  );
}
