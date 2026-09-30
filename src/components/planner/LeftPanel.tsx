'use client';
import { Clock } from './Clock';
import { QuickButtons } from './QuickButtons';
import { SoonList } from './SoonList';

export function LeftPanel() {
  return (
    <aside className="col" aria-label="Jam, jadwal terdekat, dan tombol cepat">
      <Clock />
      <SoonList />
      <QuickButtons />
    </aside>
  );
}
