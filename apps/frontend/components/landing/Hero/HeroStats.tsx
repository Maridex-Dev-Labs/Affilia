const stats = [
  { label: 'Paid Out', value: 'KES 12M+' },
  { label: 'Merchants', value: '500+' },
  { label: 'Affiliates', value: '2,000+' },
];

export default function HeroStats() {
  return (
    <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card-surface p-4 text-center">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
