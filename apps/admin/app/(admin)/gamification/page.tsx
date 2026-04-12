'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    badge_icon: '',
    xp_reward: '',
    requirement_type: '',
    requirement_value: '',
  });

  const load = async () => {
    const { data } = await supabase.from('achievements').select('*').order('name', { ascending: true });
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name) return;
    await supabase.from('achievements').insert({
      name: form.name,
      description: form.description,
      badge_icon: form.badge_icon || null,
      xp_reward: Number(form.xp_reward || 0),
      requirement_type: form.requirement_type || null,
      requirement_value: Number(form.requirement_value || 0),
    });
    setForm({ name: '', description: '', badge_icon: '', xp_reward: '', requirement_type: '', requirement_value: '' });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('achievements').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gamification</h1>

      <div className="card-surface p-6 space-y-4">
        <h3 className="text-lg font-bold">Create Achievement</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
            placeholder="Badge Icon (emoji)"
            value={form.badge_icon}
            onChange={(e) => setForm({ ...form, badge_icon: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
            placeholder="XP Reward"
            value={form.xp_reward}
            onChange={(e) => setForm({ ...form, xp_reward: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
            placeholder="Requirement Type"
            value={form.requirement_type}
            onChange={(e) => setForm({ ...form, requirement_type: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
            placeholder="Requirement Value"
            value={form.requirement_value}
            onChange={(e) => setForm({ ...form, requirement_value: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm sm:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button className="border border-white/20 rounded-full px-4 py-2 text-xs" onClick={create}>
          Add Achievement
        </button>
      </div>

      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">XP</th>
              <th className="py-2">Requirement</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t border-soft">
                <td className="py-3">{a.badge_icon ? `${a.badge_icon} ` : ''}{a.name}</td>
                <td className="py-3">{a.xp_reward}</td>
                <td className="py-3">{a.requirement_type || '—'} {a.requirement_value || ''}</td>
                <td className="py-3">
                  <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => remove(a.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No achievements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
