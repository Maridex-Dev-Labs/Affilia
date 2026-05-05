import { siteConfig } from '@/lib/config/site';

const LEGACY_APP_HOSTS = new Set(['affilia.vercel.app', 'www.affilia-ke.vercel.app', 'affilia-ke.vercel.app']);

export function normalizeRedirectTarget(value: string | null | undefined, requestUrl: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    if (LEGACY_APP_HOSTS.has(parsed.hostname) && (parsed.pathname.startsWith('/marketplace') || parsed.pathname.startsWith('/r/'))) {
      const requestOrigin = new URL(requestUrl).origin;
      return `${requestOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    try {
      const base = new URL(siteConfig.url);
      const resolved = new URL(value, base);
      return resolved.toString();
    } catch {
      return null;
    }
  }
}
