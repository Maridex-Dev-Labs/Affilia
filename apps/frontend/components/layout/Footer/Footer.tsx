import Link from 'next/link';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/8 bg-black px-4 pb-8 pt-16 md:px-8">
      <div className="mx-auto mb-12 grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-5">
        <div className="col-span-2">
          <Link href="/" className="mb-4 flex items-center gap-3">
            <BrandLogo markClassName="h-10 w-10" textClassName="text-xl font-black text-white" />
          </Link>
          <p className="max-w-xs text-sm text-[#7e869a]">
            Bridge local merchants with high-performing marketers in Nakuru, Kenya.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-bold text-white">Platform</h4>
          <ul className="space-y-2 text-sm text-[#7e869a]">
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/signup">For Merchants</Link></li>
            <li><Link href="/signup">For Affiliates</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-bold text-white">Company</h4>
          <ul className="space-y-2 text-sm text-[#7e869a]">
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-bold text-white">Legal</h4>
          <ul className="space-y-2 text-sm text-[#7e869a]">
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/kra-compliance">KRA Compliance</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/6 pt-8 text-xs text-[#667089] md:flex-row">
        <p>© 2026 Maridex Dev Labs. All rights reserved.</p>
        <p>Built With Kenyan Pride 🇰🇪</p>
      </div>
    </footer>
  );
}
