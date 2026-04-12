'use client';

import { useUiStore } from '@/lib/stores/ui.store';

export default function SidebarToggle() {
  const toggle = useUiStore((s) => s.toggle);
  return (
    <button className="text-xs text-muted" onClick={toggle}>
      Toggle
    </button>
  );
}
