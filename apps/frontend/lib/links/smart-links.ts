import { siteConfig } from '@/lib/config/site';

export function getCanonicalAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || siteConfig.url).replace(/\/$/, '');
}

export function buildSmartLink(code: string) {
  return `${getCanonicalAppUrl()}/r/${code}`;
}

export function buildPublicProductLink(productId: string, code?: string) {
  const base = `${getCanonicalAppUrl()}/marketplace/products/${productId}`;
  return code ? `${base}?ref=${encodeURIComponent(code)}` : base;
}
