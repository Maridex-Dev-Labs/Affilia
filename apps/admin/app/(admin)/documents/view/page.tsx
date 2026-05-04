'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase/admin-client';

const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'json', 'md', 'log']);

function getExtension(value: string) {
  const clean = value.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop();
  return ext ? ext.toLowerCase() : '';
}

function labelFromPath(path: string) {
  const segment = path.split('/').pop() || path;
  return decodeURIComponent(segment);
}

export default function Page() {
  const searchParams = useSearchParams();
  const bucket = searchParams.get('bucket') || '';
  const path = searchParams.get('path') || '';
  const name = searchParams.get('name') || labelFromPath(path || 'document');

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extension = useMemo(() => getExtension(name || path), [name, path]);

  useEffect(() => {
    const load = async () => {
      if (!bucket || !path) {
        setError('Missing storage bucket or document path.');
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Admin session unavailable.');

        const response = await fetch('/api/verification-assets/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bucket, path, expiresIn: 300 }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to sign document.');
        setSignedUrl(data.signedUrl);

        if (TEXT_EXTENSIONS.has(extension)) {
          const previewResponse = await fetch(data.signedUrl);
          const previewText = await previewResponse.text();
          setTextPreview(previewText);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load document.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [bucket, extension, path]);

  const officeViewerUrl = signedUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Document Viewer</h1>
          <p className="mt-2 text-sm text-muted">{name}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-full border border-white/15 px-4 py-2 text-xs text-white" href="/verifications">
            Back to Verification Queue
          </Link>
          {signedUrl ? (
            <a className="rounded-full border border-white/15 px-4 py-2 text-xs text-white" href={signedUrl} target="_blank" rel="noreferrer noopener">
              Open Raw File
            </a>
          ) : null}
          {signedUrl ? (
            <a className="rounded-full border border-white/15 px-4 py-2 text-xs text-white" href={`${signedUrl}${signedUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`} target="_blank" rel="noreferrer noopener">
              Download
            </a>
          ) : null}
        </div>
      </div>

      {loading ? <div className="card-surface p-6 text-sm text-muted">Preparing document...</div> : null}
      {error ? <div className="card-surface p-6 text-sm text-red-300">{error}</div> : null}

      {!loading && !error && signedUrl ? (
        <div className="card-surface min-h-[70vh] p-4">
          {extension === 'pdf' ? <iframe title={name} src={signedUrl} className="h-[75vh] w-full rounded-2xl border border-white/10 bg-white" /> : null}
          {IMAGE_EXTENSIONS.has(extension) ? <img src={signedUrl} alt={name} className="mx-auto max-h-[75vh] rounded-2xl border border-white/10 object-contain" /> : null}
          {TEXT_EXTENSIONS.has(extension) ? <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-[#d8deea]">{textPreview}</pre> : null}
          {OFFICE_EXTENSIONS.has(extension) && officeViewerUrl ? <iframe title={name} src={officeViewerUrl} className="h-[75vh] w-full rounded-2xl border border-white/10 bg-white" /> : null}
          {!IMAGE_EXTENSIONS.has(extension) && !TEXT_EXTENSIONS.has(extension) && !OFFICE_EXTENSIONS.has(extension) && extension !== 'pdf' ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center text-sm text-muted">
              <p>This document type cannot be rendered inline in the browser viewer.</p>
              <p>Use <span className="text-white">Open Raw File</span> or <span className="text-white">Download</span> to inspect the full file.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
