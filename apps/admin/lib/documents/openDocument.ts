const OFFICE_VIEWER_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

function extractExtension(path: string) {
  const normalized = path.split('?')[0].split('#')[0];
  const segment = normalized.split('/').pop() || normalized;
  const dotIndex = segment.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return segment.slice(dotIndex + 1).toLowerCase();
}

export function openSignedDocument(signedUrl: string, originalPath: string) {
  const extension = extractExtension(originalPath);
  if (OFFICE_VIEWER_EXTENSIONS.has(extension)) {
    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signedUrl)}`;
    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(signedUrl, '_blank', 'noopener,noreferrer');
}
