import Navbar from '@/components/layout/Navbar/Navbar';
import Footer from '@/components/layout/Footer/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-kenya-navy text-white min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
