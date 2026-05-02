'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChatCircleDots,
  CheckCircle,
  ChartLineUp,
  Copy,
  ShieldCheck,
  Trophy,
  Wallet,
} from '@phosphor-icons/react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { affiliatePlans, merchantPlans, formatKes } from '@/lib/config/pricing';

const KENYA_IMAGES = [
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1518732714860-b62714ce0c59?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=1920',
  'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=1920',
];

const features = [
  { icon: ShieldCheck, title: 'Smart Escrow', description: 'Funds secured until sales are verified. Merchants stay in control of release.' },
  { icon: Trophy, title: 'Gamification', description: 'Earn XP, unlock achievements, and climb the leaderboard every week.' },
  { icon: ChartLineUp, title: 'Live Analytics', description: 'Track every click and every conversion in real time across channels.' },
  { icon: Wallet, title: 'M-Pesa Native', description: 'Deposits and payouts built around how Kenyan users already transact.' },
  { icon: ChatCircleDots, title: 'Direct Chat', description: 'Merchants and affiliates can coordinate deals without leaving the platform.' },
  { icon: Copy, title: 'Official Receipts', description: 'Every deposit, payout, and batch is documented with verifiable receipts.' },
];

const steps = [
  { step: '01', title: 'Merchant lists products', description: 'Set commission, upload proof, and deposit working balance into escrow.' },
  { step: '02', title: 'Affiliate grabs links', description: 'Marketers pick verified products, generate smart links, and start promoting instantly.' },
  { step: '03', title: 'Sales get verified', description: 'Clicks and conversions are tracked while merchants approve completed offline sales.' },
  { step: '04', title: 'M-Pesa payouts land', description: 'Affiliates are swept into daily payouts with receipts and status visibility.' },
];

const testimonials = [
  { name: 'Grace W.', role: 'Top Affiliate', quote: 'The speed matters. I can see clicks live and know what to push harder before the day ends.' },
  { name: 'Keja Shoes', role: 'Merchant', quote: 'We only pay when sales are confirmed. That makes the system useful, not just flashy.' },
  { name: 'Peter O.', role: 'Affiliate', quote: 'Daily M-Pesa payouts changed how seriously I treat affiliate marketing. It feels like a real business.' },
];

function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay }}
      className="group card-surface card-hover relative overflow-hidden p-6"
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setHeroImageIndex((current) => (current + 1) % KENYA_IMAGES.length), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-20 md:px-8">
        <div className="absolute inset-0 z-0 bg-[#0A0E17]">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={heroImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.82, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.4 }}
              className="absolute inset-0"
            >
              <img src={KENYA_IMAGES[heroImageIndex]} alt="Kenyan city" className="h-full w-full object-cover" />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/38 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E17]/92 via-[#0A0E17]/42 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(10,14,23,0.22)_75%,rgba(10,14,23,0.6)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-line mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.28em] text-white">Bridge. Earn. Grow.</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6 text-5xl font-black leading-[1.05] md:text-7xl">
              Connect Your <span className="gradient-text">Business</span> With Top Marketers
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mx-auto mb-10 max-w-xl text-lg text-[#b4bccc] lg:mx-0">
              Join Kenya&apos;s fastest-growing affiliate network. Zero-day M-Pesa payouts, secure escrow, and real-time tracking built for Nakuru and beyond.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <PrimaryButton href="/signup" className="!px-8 !py-4 text-lg">
                Start Earning Today
              </PrimaryButton>
              <SecondaryButton href="/#how-it-works" className="!px-8 !py-4 text-lg">
                How It Works
              </SecondaryButton>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 flex flex-wrap justify-center gap-8 border-t border-white/8 pt-8 lg:justify-start">
              <div>
                <h4 className="gradient-text text-2xl font-black italic">KES 12M+</h4>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7e869a]">Commission Paid</p>
              </div>
              <div>
                <h4 className="gradient-text text-2xl font-black italic">500+</h4>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7e869a]">Active Merchants</p>
              </div>
              <div>
                <h4 className="gradient-text text-2xl font-black italic">2,000+</h4>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7e869a]">Verified Affiliates</p>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.32 }} className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#009A44]/25 to-[#BB0000]/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141A2B] p-8 shadow-2xl">
                <div className="kenya-flag-gradient absolute inset-x-0 top-0 h-1.5" />
                <h3 className="mb-6 text-2xl font-black italic text-white">Why Choose Affilia?</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#009A44]/18"><Wallet size={24} color="#009A44" /></div>
                    <div>
                      <h4 className="font-bold text-white">Zero-Day Payouts</h4>
                      <p className="text-sm text-[#9ca5b9]">M-Pesa payments within 24 hours for verified earnings.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#BB0000]/18"><ShieldCheck size={24} color="#BB0000" /></div>
                    <div>
                      <h4 className="font-bold text-white">Secure Escrow</h4>
                      <p className="text-sm text-[#9ca5b9]">Merchant balances are ring-fenced until sales are confirmed.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><ChartLineUp size={24} color="#ffffff" /></div>
                    <div>
                      <h4 className="font-bold text-white">Real-Time Tracking</h4>
                      <p className="text-sm text-[#9ca5b9]">See live clicks, commissions, traffic source quality, and conversion velocity.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-2 justify-center">
                  {KENYA_IMAGES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setHeroImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${index === heroImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/35'}`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="border-t border-white/8 bg-black py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-16 text-center">
            <h2 className="gradient-text mb-4 text-3xl font-black italic md:text-5xl">Everything You Need to Succeed</h2>
            <p className="mx-auto max-w-2xl text-[#9ca5b9]">Powerful tools designed for Kenyan merchants and marketers running on real operations.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <SectionCard key={feature.title} delay={index * 0.08}>
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d2438] to-black">
                    <Icon size={28} color="#ffffff" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-[#9ca5b9]">{feature.description}</p>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-[#009A44] to-[#BB0000] transition-all duration-300 group-hover:w-full" />
                </SectionCard>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/8 py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7e869a]">How It Works</div>
              <h2 className="mt-3 text-3xl font-black italic text-white md:text-5xl">Built for Kenyan Growth</h2>
            </div>
            <p className="max-w-xl text-sm text-[#9ca5b9]">Affilia is designed around real merchant workflows, real affiliate hustle, and real M-Pesa movement.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((item, index) => (
              <SectionCard key={item.step} delay={index * 0.06}>
                <div className="mb-5 text-4xl font-black italic text-[#20273a]">{item.step}</div>
                <h3 className="mb-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-[#9ca5b9]">{item.description}</p>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="border-t border-white/8 bg-black py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-14 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7e869a]">Trusted By Operators</div>
            <h2 className="mt-3 text-3xl font-black italic text-white md:text-5xl">Real Feedback From the Market</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <SectionCard key={testimonial.name} delay={index * 0.08}>
                <div className="mb-6 flex items-center gap-2 text-yellow-400">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Trophy key={star} size={18} weight="fill" />
                  ))}
                </div>
                <p className="text-base leading-7 text-[#d3d8e3]">“{testimonial.quote}”</p>
                <div className="mt-6 border-t border-white/8 pt-4">
                  <div className="font-bold text-white">{testimonial.name}</div>
                  <div className="text-sm text-[#7e869a]">{testimonial.role}</div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-white/8 py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-14 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7e869a]">Pricing</div>
            <h2 className="mt-3 text-3xl font-black italic text-white md:text-5xl">Affordable Plans For Affiliates And Merchants</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-[#9ca5b9]">
              Keep the entry barrier low. Affiliates should be able to start cheaply, and merchants should pay in line with actual business size.
            </p>
          </div>
          <div className="grid gap-10 xl:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.28em] text-[#009A44]">Affiliate Plans</div>
              <div className="grid gap-6">
                {affiliatePlans.map((plan, index) => (
                  <SectionCard key={plan.name} delay={index * 0.08}>
                    {plan.featured ? <div className="kenya-flag-gradient absolute inset-x-0 top-0 h-1" /> : null}
                    <div className="mb-2 text-lg font-black italic text-white">{plan.name}</div>
                    <div className="mb-5">
                      <span className={`text-3xl font-black ${plan.featured ? 'text-[#009A44]' : 'text-white'}`}>{formatKes(plan.priceKes)}</span>
                      <span className="ml-1 text-sm text-[#8f98ab]">{plan.cadenceLabel}</span>
                    </div>
                    <p className="mb-6 text-sm text-[#9ca5b9]">{plan.description}</p>
                    {plan.featured ? (
                      <PrimaryButton href="/signup" className="w-full justify-center text-sm">{plan.cta}</PrimaryButton>
                    ) : (
                      <SecondaryButton href="/signup" className="w-full justify-center text-sm">{plan.cta}</SecondaryButton>
                    )}
                  </SectionCard>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.28em] text-[#BB0000]">Merchant Plans</div>
              <div className="grid gap-6 lg:grid-cols-3">
                {merchantPlans.map((plan, index) => (
                  <SectionCard key={plan.name} delay={index * 0.08}>
                    {plan.featured ? <div className="kenya-flag-gradient absolute inset-x-0 top-0 h-1" /> : null}
                    <div className="mb-2 text-lg font-black italic text-white">{plan.name}</div>
                    <div className="mb-5">
                      <span className={`text-3xl font-black ${plan.featured ? 'text-[#BB0000]' : 'text-white'}`}>{formatKes(plan.priceKes)}</span>
                      <span className="ml-1 text-sm text-[#8f98ab]">{plan.cadenceLabel}</span>
                    </div>
                    <p className="mb-6 text-sm text-[#9ca5b9]">{plan.description}</p>
                    {plan.featured ? (
                      <PrimaryButton href="/signup" className="w-full justify-center text-sm">{plan.cta}</PrimaryButton>
                    ) : (
                      <SecondaryButton href="/signup" className="w-full justify-center text-sm">{plan.cta}</SecondaryButton>
                    )}
                  </SectionCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-[#0A0E17] px-4 py-24 text-center md:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-4xl font-black italic text-white md:text-5xl">Ready to Grow?</h2>
          <p className="mx-auto mb-10 max-w-xl text-[#9ca5b9]">Join thousands of merchants and affiliates already compounding attention, trust, and conversions inside Affilia.</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <PrimaryButton href="/signup" className="mx-auto !px-12 !py-4 text-lg sm:mx-0">Create Free Account</PrimaryButton>
            <Link href="/affiliate/marketplace" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-8 py-4 text-sm font-bold italic text-white hover:bg-white/5">
              Browse Marketplace
              <CheckCircle size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
