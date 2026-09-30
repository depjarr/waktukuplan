'use client';
import { MiniCalendar } from './MiniCalendar';
import { NotesPanel } from './NotesPanel';
import { usePlanner } from './PlannerProvider';
import { Reminders } from './Reminders';

export function RightPanel() {
  const { ui } = usePlanner();
  return (
    <aside className="col right" aria-label="Kalender mini, pengingat, catatan">
      {ui.mini && <><MiniCalendar /><Reminders /></>}
      {ui.notes === 'dock' && <NotesPanel />}
    </aside>
  );
}
