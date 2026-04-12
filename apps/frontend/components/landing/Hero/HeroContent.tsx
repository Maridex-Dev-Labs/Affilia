import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';

export default function HeroContent() {
  return (
    <div>
      <span className="inline-flex items-center rounded-full border border-soft px-4 py-2 text-xs uppercase tracking-widest text-muted">
        Bridge. Earn. Grow.
      </span>
      <h1 className="mt-6 text-5xl lg:text-6xl font-extrabold leading-tight">
        Connect Your Business With Top Marketers Across Kenya
      </h1>
      <p className="mt-6 text-lg text-muted max-w-xl">
        Launch campaigns from Nairobi to Mombasa with a premium affiliate network built for
        Kenyan merchants, creators, and mobile-first commerce.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <PrimaryButton href="/signup">Start Earning Today</PrimaryButton>
        <SecondaryButton href="/#how-it-works">How It Works</SecondaryButton>
      </div>
    </div>
  );
}
