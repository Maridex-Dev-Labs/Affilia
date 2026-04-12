export default function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="card-surface p-6">
      <p className="text-muted">“{quote}”</p>
      <p className="mt-4 font-semibold">— {name}</p>
      <p className="text-xs text-muted">{role}</p>
    </div>
  );
}
