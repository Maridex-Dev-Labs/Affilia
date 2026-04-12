export default function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-surface p-6 hover:shadow-glow transition">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted mt-3">{desc}</p>
    </div>
  );
}
