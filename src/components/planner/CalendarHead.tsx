'use client';
import { MONTHS } from '@/lib/dates';
import { usePlanner } from './PlannerProvider';

const HINTS = {
  pencil: 'Mode pensil: coret langsung di kalender',
  eraser: 'Penghapus: gosok coretan yang mau dihapus',
  text: 'Klik di kalender untuk menaruh teks',
  select: '',
} as const;

export function CalendarHead() {
  const { view, gotoMonth, setMini } = usePlanner();
  const shift = (n: number) => {
    const d = new Date(view.year, view.month + n, 1);
    gotoMonth(d.getFullYear(), d.getMonth());
  };
  const today = () => {
    const n = new Date();
    gotoMonth(n.getFullYear(), n.getMonth());
    setMini(n.getFullYear(), n.getMonth());
  };
  return (
    <div className="calhead">
      <button className="rnd" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>‹</button>
      <h2>{MONTHS[view.month]} <span>{view.year}</span></h2>
      <button className="rnd" aria-label="Bulan berikutnya" onClick={() => shift(1)}>›</button>
      <button className="btn small" onClick={today}>Hari ini</button>
      <span className="hint">{HINTS[view.tool]}</span>
    </div>
  );
}
