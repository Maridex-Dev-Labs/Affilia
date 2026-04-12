import HeroSlideshow from './HeroSlideshow';
import HeroContent from './HeroContent';
import HeroStats from './HeroStats';

export default function Hero() {
  return (
    <section id="top" className="relative min-h-[90vh] overflow-hidden">
      <HeroSlideshow />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <HeroContent />
        <div className="bg-kenya-surface/80 border border-soft rounded-3xl p-6 self-start">
          <h3 className="text-xl font-bold">Why Choose Affilia?</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>Zero-Day M-Pesa Payouts</li>
            <li>Secure Escrow Protection</li>
            <li>Real-Time Tracking</li>
            <li>Direct Merchant Chat</li>
            <li>Built for Nakuru</li>
          </ul>
        </div>
      </div>
      <HeroStats />
    </section>
  );
}
