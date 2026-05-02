import type { PlanRole } from '@/lib/config/pricing';

export const AFFILIATE_PRE_VERIFICATION_ROUTES = [
  '/affiliate/overview',
  '/affiliate/marketplace',
  '/affiliate/settings',
] as const;

const FEATURE_ROUTE_MAP = {
  affiliate: {
    affiliate_starter: [
      '/affiliate/overview',
      '/affiliate/marketplace',
      '/affiliate/community',
      '/affiliate/my-links',
      '/affiliate/earnings',
      '/affiliate/receipts',
      '/affiliate/achievements',
      '/affiliate/settings',
    ],
    affiliate_growth: [
      '/affiliate/overview',
      '/affiliate/marketplace',
      '/affiliate/community',
      '/affiliate/my-links',
      '/affiliate/earnings',
      '/affiliate/receipts',
      '/affiliate/achievements',
      '/affiliate/settings',
      '/affiliate/academy',
      '/affiliate/leaderboard',
    ],
  },
  merchant: {
    merchant_starter: [
      '/merchant/overview',
      '/merchant/products',
      '/merchant/orders',
      '/merchant/escrow',
      '/merchant/receipts',
      '/merchant/settings',
    ],
    merchant_growth: [
      '/merchant/overview',
      '/merchant/products',
      '/merchant/orders',
      '/merchant/escrow',
      '/merchant/receipts',
      '/merchant/settings',
      '/merchant/community',
      '/merchant/analytics',
    ],
    merchant_pro: [
      '/merchant/overview',
      '/merchant/products',
      '/merchant/orders',
      '/merchant/escrow',
      '/merchant/receipts',
      '/merchant/settings',
      '/merchant/community',
      '/merchant/analytics',
      '/merchant/affiliates',
    ],
  },
} as const;

function routeMatches(pathname: string | null | undefined, route: string) {
  if (!pathname) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function allowedRoutesForPlan(role: PlanRole, activePlanCode: string | null | undefined) {
  const roleMap = FEATURE_ROUTE_MAP[role];
  if (!activePlanCode) {
    return role === 'affiliate'
      ? ['/affiliate/overview', '/affiliate/marketplace', '/affiliate/settings']
      : ['/merchant/overview', '/merchant/settings', '/merchant/receipts'];
  }
  return (roleMap as Record<string, readonly string[]>)[activePlanCode] || [];
}

export function canAccessWorkspacePath({
  role,
  pathname,
  activePlanCode,
  affiliateVerificationStatus,
}: {
  role: PlanRole;
  pathname: string | null | undefined;
  activePlanCode: string | null | undefined;
  affiliateVerificationStatus?: string | null;
}) {
  if (role === 'affiliate' && affiliateVerificationStatus !== 'verified') {
    return AFFILIATE_PRE_VERIFICATION_ROUTES.some((route) => routeMatches(pathname, route));
  }

  const allowed = allowedRoutesForPlan(role, activePlanCode);
  return allowed.some((route) => routeMatches(pathname, route));
}

export function hasAffiliateOperationalAccess(activePlanCode: string | null | undefined, affiliateVerificationStatus?: string | null) {
  return affiliateVerificationStatus === 'verified' && Boolean(activePlanCode);
}
