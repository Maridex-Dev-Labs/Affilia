'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from '@/components/shared/QRCode/QRCode';
import QRCodeGenerator from './components/QRCodeGenerator';
import { affiliateApi } from '@/lib/api/affiliate';
import { usePlanAccess } from '@/lib/hooks/usePlanAccess';
import { sanitizeUserFacingError } from '@/lib/errors';
import { buildSmartLink } from '@/lib/links/smart-links';

type LinkRow = {
  id: string;
  unique_code: string;
  destination_url?: string | null;
  clicks: number;
  conversions: number;
  total_earned_kes: number;
  status: 'active' | 'paused' | 'archived';
  products?: { title?: string | null } | null;
};

export default function Page() {
  const searchParams = useSearchParams();
  const { canGenerateAffiliateLinks } = usePlanAccess();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [workingLinkId, setWorkingLinkId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await affiliateApi.links();
      setLinks(data.items || []);
      if (!searchParams.get('created')) {
        setStatus(null);
      }
    } catch (error: unknown) {
      setStatus(sanitizeUserFacingError(error, 'We could not load your tracking links right now.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const created = searchParams.get('created');
    if (created) {
      setStatus(`Smart link ${created} is ready to share below.`);
    }
  }, [searchParams]);

  const topActiveLink = useMemo(() => links.find((link) => link.status === 'active') || links[0] || null, [links]);

  const runAction = async (linkId: string, action: 'pause' | 'resume' | 'archive' | 'delete') => {
    setStatus(null);
    setWorkingLinkId(linkId);
    try {
      if (action === 'pause') await affiliateApi.pauseLink(linkId);
      if (action === 'resume') await affiliateApi.resumeLink(linkId);
      if (action === 'archive') await affiliateApi.archiveLink(linkId);
      if (action === 'delete') {
        const response = await affiliateApi.deleteLink(linkId);
        setStatus(response.status === 'archived' ? 'This link had activity, so it was archived instead of permanently deleted.' : 'Link deleted.');
      }
      await load();
    } catch (error: unknown) {
      setStatus(sanitizeUserFacingError(error, 'We could not update that link right now.'));
    } finally {
      setWorkingLinkId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Tracking Links</h1>
        <p className="mt-2 text-muted">
          Active links can be paused or resumed. Links with clicks, conversions, or earnings are archived instead of being permanently deleted.
        </p>
      </div>

      {status ? <div className="card-surface p-4 text-sm text-[#d4dbe7]">{status}</div> : null}

      <div className="card-surface p-6 mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Product</th>
              <th className="py-2">Code</th>
              <th className="py-2">URL</th>
              <th className="py-2">Clicks</th>
              <th className="py-2">Conv.</th>
              <th className="py-2">Earnings</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const shareUrl = buildSmartLink(link.unique_code);
              return (
              <tr key={link.id} className="border-t border-soft">
                <td className="py-3">{link.products?.title || 'Product'}</td>
                <td className="py-3 font-mono">{link.unique_code}</td>
                <td className="py-3 max-w-[280px]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-xs font-mono text-[#cfd5e1] break-all">
                    {shareUrl}
                  </div>
                  <div className="mt-2 text-[11px] text-white/45">Redirects visitors to the public product page.</div>
                </td>
                <td className="py-3">{link.clicks}</td>
                <td className="py-3">{link.conversions}</td>
                <td className="py-3">KES {link.total_earned_kes}</td>
                <td className="py-3 capitalize">{link.status}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => navigator.clipboard.writeText(shareUrl)} type="button">
                      Copy URL
                    </button>
                    <QRCodeGenerator value={shareUrl} code={link.unique_code} />
                    {link.status === 'active' ? (
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" disabled={workingLinkId === link.id} onClick={() => runAction(link.id, 'pause')}>
                        Pause
                      </button>
                    ) : null}
                    {link.status === 'paused' ? (
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" disabled={workingLinkId === link.id || !canGenerateAffiliateLinks} onClick={() => runAction(link.id, 'resume')}>
                        Resume
                      </button>
                    ) : null}
                    {link.status !== 'archived' ? (
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" disabled={workingLinkId === link.id} onClick={() => runAction(link.id, 'archive')}>
                        Archive
                      </button>
                    ) : null}
                    <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" disabled={workingLinkId === link.id} onClick={() => runAction(link.id, 'delete')}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {links.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-muted">
                  No links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-surface p-6 mt-6">
        <h3 className="text-lg font-bold">Quick QR</h3>
        <p className="text-muted text-sm mt-2">Share your top active link instantly. Merchants can also use the visible code for offline/manual sale attribution.</p>
        <div className="mt-4">
          {topActiveLink ? (
            <div className="space-y-3">
              <QRCode value={buildSmartLink(topActiveLink.unique_code)} />
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-mono text-[#cfd5e1]">{buildSmartLink(topActiveLink.unique_code)}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-6 text-sm text-muted">Generate your first active link from the affiliate marketplace to unlock QR sharing.</div>
          )}
        </div>
      </div>
    </div>
  );
}
