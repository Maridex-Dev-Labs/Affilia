'use client';

import { QRCodeCanvas } from 'qrcode.react';

export default function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex items-center justify-center rounded-xl bg-white p-3">
      <QRCodeCanvas value={value} size={size} level="M" includeMargin />
    </div>
  );
}
