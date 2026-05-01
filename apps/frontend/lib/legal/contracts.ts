export type AgreementType = 'merchant' | 'affiliate';

export const contractMeta: Record<AgreementType, {
  title: string;
  blurb: string;
  summary: string[];
  clauses: { heading: string; detail: string }[];
  acknowledgements: { key: 'terms' | 'fees' | 'privacy' | 'dispute'; label: string }[];
}> = {
  merchant: {
    title: 'Affilia Merchant Agreement',
    blurb: 'Required before merchant accounts can list products fully and participate in escrow-backed transactions.',
    summary: [
      'Covers escrow, approvals, platform fees, lawful product listing, and dispute handling.',
      'Bans counterfeit goods, fake sales, tracking bypass, harassment, and money-laundering use cases.',
      'Requires accurate business information, sufficient escrow, and timely order approvals.',
    ],
    clauses: [
      { heading: 'Escrow and payouts', detail: 'Merchant funds support affiliate commissions and remain subject to verification, withdrawal windows, and platform controls.' },
      { heading: 'Sales approval duty', detail: 'Merchants must approve or reject legitimate sales quickly and provide a defensible reason when rejecting.' },
      { heading: 'Compliance', detail: 'Merchants must keep valid business details, KRA data, and comply with Kenyan consumer and commercial law.' },
      { heading: 'Termination and disputes', detail: 'Affilia may suspend abusive accounts and disputes escalate through negotiation, mediation, then Kenyan arbitration/courts.' },
    ],
    acknowledgements: [
      { key: 'terms', label: 'I have read and agree to the Affilia Merchant Agreement.' },
      { key: 'fees', label: 'I understand the fee structure, escrow controls, and payout timing.' },
      { key: 'privacy', label: 'I confirm the submitted business information is accurate and lawfully provided.' },
      { key: 'dispute', label: 'I accept the Kenyan-law dispute resolution and termination clauses.' },
    ],
  },
  affiliate: {
    title: 'Affilia Affiliate Agreement',
    blurb: 'Required before affiliate accounts can generate links, receive payouts, and access full marketplace operations.',
    summary: [
      'Covers attribution rules, payout handling, non-circumvention, honest marketing, and platform discipline.',
      'Bans self-referrals, spam, bots, fake accounts, deceptive promotion, and off-platform merchant bypass deals.',
      'Requires accurate payout details and compliance with Kenyan advertising and consumer law.',
    ],
    clauses: [
      { heading: 'Promotion rules', detail: 'Affiliates must market honestly, use official links and codes only, and avoid spammy or misleading promotion.' },
      { heading: 'Commissions and payouts', detail: 'Commissions accrue only on approved sales and the platform may hold suspicious activity for review.' },
      { heading: 'Non-circumvention', detail: 'Affiliates cannot bypass Affilia to work directly with merchants or redirect marketplace relationships off-platform.' },
      { heading: 'Disputes and termination', detail: 'Affilia may terminate abusive accounts and disputes escalate through negotiation, mediation, then Kenyan arbitration/courts.' },
    ],
    acknowledgements: [
      { key: 'terms', label: 'I have read and agree to the Affilia Affiliate Agreement.' },
      { key: 'fees', label: 'I understand payout timing, fees, and attribution rules.' },
      { key: 'privacy', label: 'I confirm the submitted personal and payout information is accurate.' },
      { key: 'dispute', label: 'I accept the Kenyan-law dispute resolution and termination clauses.' },
    ],
  },
};
