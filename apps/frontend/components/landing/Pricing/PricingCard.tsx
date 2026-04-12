export default function PricingCard({ name, price, desc }: { name: string; price: string; desc: string }) {
  return (
    <div className="card-surface p-6">
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="text-3xl font-extrabold mt-2">{price}</div>
      <p className="text-muted mt-3">{desc}</p>
    </div>
  );
}
