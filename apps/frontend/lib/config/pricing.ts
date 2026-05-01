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
    description: 'Begin generating links, join the marketplace, and receive tracked earnings.',
    cta: 'Start Free',
    featured: false,
    highlights: ['Marketplace access', 'Tracked smart links', 'Community access'],
  },
  {
    code: 'affiliate_growth',
    role: 'affiliate',
    name: 'Affiliate Growth',
    priceKes: 250,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'Affordable premium access with academy sessions, advanced insights, and priority payouts support.',
    cta: 'Upgrade Affiliate',
    featured: true,
    highlights: ['Academy sessions', 'Priority support', 'Advanced performance insights'],
  },
];

export const merchantPlans: PricingPlan[] = [
  {
    code: 'merchant_starter',
    role: 'merchant',
    name: 'Merchant Starter',
    priceKes: 300,
    cadenceLabel: '/month',
    billingCycle: 'monthly',
    description: 'For small businesses listing products, reviewing sales, and running entry-level affiliate campaigns.',
    cta: 'Start Selling',
    featured: false,
    highlights: ['Basic analytics', 'Product moderation queue', 'Affiliate management'],
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
