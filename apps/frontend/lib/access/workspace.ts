import type { PlanRole } from '@/lib/config/pricing';

export const AFFILIATE_PRE_VERIFICATION_ROUTES = [
  '/affiliate/overview',
  '/affiliate/marketplace',
  '/affiliate/settings',
  '/affiliate/community',
  '/affiliate/academy',
] as const;

const DEFAULT_FREE_ROUTES = {
  affiliate: [
    '/affiliate/overview',
    '/affiliate/marketplace',
    '/affiliate/community',
    '/affiliate/my-links',
    '/affiliate/earnings',
    '/affiliate/receipts',
    '/affiliate/achievements',
    '/affiliate/academy',
    '/affiliate/leaderboard',
    '/affiliate/settings',
  ],
  merchant: [
    '/merchant/overview',
    '/merchant/products',
    '/merchant/orders',
    '/merchant/affiliates',
    '/merchant/community',
    '/merchant/analytics',
    '/merchant/escrow',
    '/merchant/receipts',
    '/merchant/settings',
  ],
} as const;

const FEATURE_ROUTE_MAP = {
  affiliate: {
    affiliate_starter: DEFAULT_FREE_ROUTES.affiliate,
    affiliate_growth: [
      ...DEFAULT_FREE_ROUTES.affiliate,
    ],
  },
  merchant: {
    merchant_free: DEFAULT_FREE_ROUTES.merchant,
    merchant_starter: [
      ...DEFAULT_FREE_ROUTES.merchant,
    ],
    merchant_growth: [
      ...DEFAULT_FREE_ROUTES.merchant,
    ],
    merchant_pro: [
      ...DEFAULT_FREE_ROUTES.merchant,
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
    return DEFAULT_FREE_ROUTES[role];
  }
  return (roleMap as Record<string, readonly string[]>)[activePlanCode] || DEFAULT_FREE_ROUTES[role];
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
  return affiliateVerificationStatus === 'verified' && Boolean(activePlanCode || activePlanCode === 'affiliate_starter');
}
