export type BillingCycle = 'monthly';
export type PlanRole = 'merchant' | 'affiliate';

export type PricingPlan = {
  code: string;
  role: PlanRole;
  name: string;
  priceKes: number;
  cadenceLabel: string;
  billingCycle: BillingCycle;
  description: string;
  cta: string;
  featured: boolean;
  highlights: string[];
};

export const affiliatePlans: PricingPlan[] = [
  {
    code: 'affiliate_starter',
    role: 'affiliate',
    name: 'Affiliate Starter',
    priceKes: 0,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'Get verified, explore the marketplace, generate a few smart links, join community discussions, and learn the platform with basic academy content.',
    cta: 'Start Free',
    featured: false,
    highlights: ['Marketplace access', 'Community and forum access', 'Basic analytics and academy'],
  },
  {
    code: 'affiliate_growth',
    role: 'affiliate',
    name: 'Affiliate Growth',
    priceKes: 250,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'Affordable premium access with deeper insights, premium academy sessions, and better operational support as you scale promotions.',
    cta: 'Upgrade Affiliate',
    featured: true,
    highlights: ['Premium academy sessions', 'Priority support', 'Advanced performance insights'],
  },
];

export const merchantPlans: PricingPlan[] = [
  {
    code: 'merchant_free',
    role: 'merchant',
    name: 'Merchant Free',
    priceKes: 0,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'Launch with a lean setup: list a few products, review affiliate activity, attribute offline sales, and access community and basic analytics.',
    cta: 'Start Free',
    featured: false,
    highlights: ['Up to 2 products', 'Community access', 'Basic analytics and affiliate management'],
  },
  {
    code: 'merchant_starter',
    role: 'merchant',
    name: 'Merchant Starter',
    priceKes: 300,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'For small businesses that need more campaign room, more listings, and steadier affiliate operations.',
    cta: 'Start Selling',
    featured: false,
    highlights: ['More product capacity', 'Stronger campaign handling', 'Operational visibility'],
  },
  {
    code: 'merchant_growth',
    role: 'merchant',
    name: 'Merchant Growth',
    priceKes: 950,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'Better reporting, faster support, larger campaign capacity, and more operational visibility.',
    cta: 'Upgrade Merchant',
    featured: true,
    highlights: ['Faster support', 'Stronger reporting', 'Higher campaign capacity'],
  },
  {
    code: 'merchant_pro',
    role: 'merchant',
    name: 'Merchant Pro',
    priceKes: 2500,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'For multi-product teams needing stronger controls, scale, and partner management.',
    cta: 'Talk to Sales',
    featured: false,
    highlights: ['Advanced controls', 'Team-scale operations', 'Priority operational review'],
  },
];

export const paymentChannels = [
  {
    code: 'mpesa_p2p',
    name: 'M-Pesa P2P / Pochi La Biashara',
    destination: '884422',
    helpText: 'Send the package fee to the Affilia P2P number, then paste the M-Pesa confirmation code below for review.',
  },
] as const;

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}
