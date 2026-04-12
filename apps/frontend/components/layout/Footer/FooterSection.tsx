import Link from 'next/link';

type FooterLink = {
  label: string;
  href: string;
};

export default function FooterSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {links.map((link) => (
          <li key={link.label}>
            <Link className="hover:text-white transition" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
