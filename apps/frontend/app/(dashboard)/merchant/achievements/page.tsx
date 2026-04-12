import { achievements } from '@/lib/config/achievements';

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Achievements</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <div key={a.name} className="card-surface p-5">
            <h3 className="font-semibold">{a.name}</h3>
            <p className="text-xs text-muted mt-2">XP Reward: {a.xp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
