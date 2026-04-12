import FeatureCard from './FeatureCard';

const features = [
  { title: 'Smart Escrow', desc: 'Funds secured until sales verified.' },
  { title: 'Gamification', desc: 'Earn XP, unlock achievements.' },
  { title: 'Live Analytics', desc: 'Track every click and conversion.' },
  { title: 'M-Pesa Native', desc: 'Seamless deposits and payouts.' },
  { title: 'Direct Chat', desc: 'Communicate securely in-app.' },
  { title: 'Official Receipts', desc: 'KRA-compliant documentation.' },
];

export default function FeaturesGrid() {
  return (
    <div className="grid gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard key={feature.title} {...feature} />
      ))}
    </div>
  );
}
