import Link from 'next/link';

const links = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Testimonials', href: '/#testimonials' },
  { label: 'Marketplace', href: '/affiliate/marketplace' },
];

export default function NavLinks() {
  return (
    <nav className="hidden md:flex gap-8 text-sm font-bold text-[#c3cad8]">
      {links.map((link) => (
        <Link key={link.label} href={link.href} className="hover:text-[#009A44] transition-colors">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
