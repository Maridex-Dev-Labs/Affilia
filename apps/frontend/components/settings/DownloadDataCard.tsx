'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { usersApi } from '@/lib/api/users';
import { sanitizeUserFacingError } from '@/lib/errors';

export default function DownloadDataCard() {
  const [status, setStatus] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    setStatus(null);
    try {
      const { blob, filename } = await usersApi.downloadMyData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Your data export is ready and has started downloading.');
    } catch (error: any) {
      setStatus(sanitizeUserFacingError(error, 'We could not prepare your data export right now.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Download My Data</h3>
          <p className="mt-2 text-sm text-[#aab2c5]">
            Export your profile, billing history, links or products, agreements, receipts, community activity, and uploaded verification records in one ZIP file.
          </p>
        </div>
      </div>
      {status ? <p className="mt-4 text-sm text-[#9ed4b2]">{status}</p> : null}
      <div className="mt-5">
        <Button loading={downloading} loadingText="Preparing export..." onClick={download}>
          Download My Data
        </Button>
      </div>
    </div>
  );
}
