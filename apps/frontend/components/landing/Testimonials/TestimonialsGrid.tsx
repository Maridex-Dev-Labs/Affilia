import TestimonialCard from './TestimonialCard';

const testimonials = [
  {
    quote: 'Affilia transformed my mitumba business. Sales have tripled!',
    name: 'Keja Shoes',
    role: 'Nakuru West',
  },
  {
    quote: 'As a student, Affilia is my main income. I earn KES 15,000+ weekly.',
    name: 'Jane Mwangi',
    role: 'Top Affiliate',
  },
  {
    quote: 'The escrow system gives me peace of mind. Zero-day payouts are real!',
    name: 'Peter Odhiambo',
    role: 'Nakuru East',
  },
];

export default function TestimonialsGrid() {
  return (
    <div className="grid gap-6 mt-10 lg:grid-cols-3">
      {testimonials.map((t) => (
        <TestimonialCard key={t.name} {...t} />
      ))}
    </div>
  );
}
