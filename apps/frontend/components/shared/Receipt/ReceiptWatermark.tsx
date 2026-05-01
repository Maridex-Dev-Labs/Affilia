import BrandLogo from '@/components/shared/BrandLogo';

export default function ReceiptWatermark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.08]">
      <BrandLogo markClassName="h-40 w-40" textClassName="text-5xl font-black tracking-[0.16em] text-white" />
    </div>
  );
}
