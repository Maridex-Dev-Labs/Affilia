import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Loading() {
  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
      <KenyanShieldLoader label="Loading admin command center..." size="lg" />
    </div>
  );
}
