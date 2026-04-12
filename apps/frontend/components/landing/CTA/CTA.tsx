import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';

export default function CTA() {
  return (
    <section className="animate-flag bg-gradient-to-r from-black via-red-600 to-green-600">
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-bold">Ready to Grow Your Business?</h2>
        <p className="mt-4 text-white/90">
          Join thousands of merchants and affiliates already earning on Affilia.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <PrimaryButton href="/signup">Get Started Free</PrimaryButton>
          <SecondaryButton href="/login">Sign In</SecondaryButton>
        </div>
      </div>
    </section>
  );
}
