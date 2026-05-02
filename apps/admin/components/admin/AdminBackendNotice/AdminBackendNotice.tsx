'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';

type OutageState = {
  message: string;
  timestamp: string;
} | null;

const STORAGE_KEY = 'affilia:admin:backend-outage';
const MAX_NOTICE_AGE_MS = 5 * 60 * 1000;

export default function AdminBackendNotice() {
  const [outage, setOutage] = useState<OutageState>(null);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed?.timestamp) {
          setOutage(null);
          return;
        }
        const age = Date.now() - new Date(parsed.timestamp).getTime();
        if (age > MAX_NOTICE_AGE_MS) {
          window.localStorage.removeItem(STORAGE_KEY);
          setOutage(null);
          return;
        }
        setOutage(parsed);
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
        <span className="mt-0.5 shrink-0 text-[#ff8d8d]">
          <WarningCircle size={20} weight="fill" />
        </span>
        <div>
          <div className="font-bold text-white">Backend service degraded</div>
          <div className="mt-1">{outage.message}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
            <span>last seen {new Date(outage.timestamp).toLocaleString('en-KE')}</span>
            <Link href="/outages" className="text-[#ffb0b0] hover:text-white">Open outage queue</Link>
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
