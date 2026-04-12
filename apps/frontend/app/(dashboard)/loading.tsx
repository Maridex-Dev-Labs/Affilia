import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <KenyanShieldLoader label="Loading dashboard..." />
    </div>
  );
}
