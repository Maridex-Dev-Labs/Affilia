const CANONICAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || '';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getAuthRedirectBase() {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const isLocalOrigin =
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('0.0.0.0');

    if (isLocalOrigin || !CANONICAL_APP_URL) {
      return trimTrailingSlash(origin);
    }
  }

  if (CANONICAL_APP_URL) {
    return trimTrailingSlash(CANONICAL_APP_URL);
  }

  return 'http://localhost:6100';
}

export function buildAuthRedirect(path: string) {
  return `${getAuthRedirectBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
