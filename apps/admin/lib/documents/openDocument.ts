export type VerificationDocumentTarget = {
  bucket?: string;
  path?: string;
  name?: string;
  url?: string;
};

export function buildDocumentViewerHref(target: VerificationDocumentTarget) {
  const params = new URLSearchParams();
  if (target.bucket) params.set('bucket', target.bucket);
  if (target.path) params.set('path', target.path);
  if (target.name) params.set('name', target.name);
  if (target.url) params.set('url', target.url);
  return `/documents/view?${params.toString()}`;
}

export function openDocumentViewer(target: VerificationDocumentTarget, options?: { newTab?: boolean }) {
  const href = buildDocumentViewerHref(target);
  if (options?.newTab) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.assign(href);
}
