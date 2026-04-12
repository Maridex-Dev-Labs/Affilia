export default function StepCard({ index, title, desc }: { index: number; title: string; desc: string }) {
  return (
    <div className="card-surface p-6">
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-black via-red-600 to-green-600 text-white font-bold">
        {index}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="text-muted mt-2">{desc}</p>
    </div>
  );
}
