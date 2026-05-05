'use client';

import { useState } from 'react';

import QRCode from '@/components/shared/QRCode/QRCode';

export default function QRCodeGenerator({ value, code }: { value: string; code: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => setOpen(true)} type="button">
        QR Code
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setOpen(false)}>
          <div className="card-surface w-full max-w-sm p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Share QR</div>
                <div className="mt-2 text-lg font-bold text-white">{code}</div>
              </div>
              <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => setOpen(false)} type="button">
                Close
              </button>
            </div>
            <div className="mt-5 flex justify-center">
              <QRCode value={value} size={220} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-mono text-[#cfd5e1] break-all">
              {value}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
