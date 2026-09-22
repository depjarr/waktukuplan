'use client';
import { useEffect, useState } from 'react';
import { themeStore } from '@/lib/theme';
import { fontStore } from '@/lib/fonts';
import { AiDialog } from './AiDialog';
import { AskDialog } from './AskDialog';
import { CalendarHead } from './CalendarHead';
import { DayDialog } from './DayDialog';
import { EventDialog } from './EventDialog';
import { ItineraryView } from './ItineraryView';
import { JournalHeader } from './JournalHeader';
import { LeftPanel } from './LeftPanel';
import { MonthGrid } from './MonthGrid';
import { MonthStrip } from './MonthStrip';
import { NotesPanel } from './NotesPanel';
import { PlannerProvider, usePlanner } from './PlannerProvider';
import { RightPanel } from './RightPanel';
import { Toast } from './Toast';
import { Toolbar } from './Toolbar';

function Layout() {
  const { view, ui } = usePlanner();
  // Tema yang tersimpan di akun (dipilih dari perangkat lain) ikut dipakai di sini.
  useEffect(() => { if (ui.theme) themeStore.set(ui.theme); }, [ui.theme]);
  useEffect(() => { if (ui.font) fontStore.set(ui.font); }, [ui.font]);
  const rightHas = ui.mini || ui.notes === 'dock';
  const cls = `layout${!ui.left ? ' no-left' : ''}${!rightHas ? ' no-right' : ''}`;
  return (
    <div className="app">
      <JournalHeader />
      <Toolbar />
      <main className={cls}>
        {ui.left && <LeftPanel />}
        <section className="center" style={{ minWidth: 0 }}>
          <MonthStrip />
          <CalendarHead />
          {view.mode === 'month' ? <MonthGrid /> : <ItineraryView />}
        </section>
        {rightHas && <RightPanel />}
      </main>
      {ui.notes === 'float' && <NotesPanel />}
      <DayDialog />
      <EventDialog />
      <AskDialog />
      <AiDialog />
      <Toast />
    </div>
  );
}

/** Komponen utama. Dirender di browser saja karena banyak bergantung pada jam & ukuran layar. */
export function Planner({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="boot">Membuka jurnalmu…</div>;
  return (
    <PlannerProvider userId={userId}>
      <Layout />
    </PlannerProvider>
  );
}