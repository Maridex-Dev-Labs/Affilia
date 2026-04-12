import PricingCard from './PricingCard';

const tiers = [
  { name: 'Starter', price: 'KES 0', desc: 'For new affiliates and merchants.' },
  { name: 'Growth', price: 'KES 500/mo', desc: 'Priority support and premium features.' },
  { name: 'Scale', price: 'KES 7,500/mo', desc: 'Enterprise tools and custom support.' },
];

export default function PricingTable() {
  return (
    <div className="grid gap-6 mt-10 lg:grid-cols-3">
      {tiers.map((tier) => (
        <PricingCard key={tier.name} {...tier} />
      ))}
    </div>
  );
}
