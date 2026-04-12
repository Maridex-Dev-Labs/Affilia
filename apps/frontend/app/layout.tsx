import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Affilia | Bridge. Earn. Grow.',
  description: 'Premium affiliate platform for Kenya.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
