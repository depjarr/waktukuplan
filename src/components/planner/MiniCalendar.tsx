'use client';
import { MONTHS, pad } from '@/lib/dates';
import { usePlanner } from './PlannerProvider';

export function MiniCalendar() {
  const { mini, setMini, byDate, todayKey, gotoMonth, openDay } = usePlanner();
  const { y, m } = mini;
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();

  const shift = (n: number) => {
    const d = new Date(y, m + n, 1);
    setMini(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="card mini">
      <div className="mhead">
        <button aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>‹</button>
        <b>{MONTHS[m]} {y}</b>
        <button aria-label="Bulan berikutnya" onClick={() => shift(1)}>›</button>
      </div>
      <div className="mg">
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => <i key={i}>{d}</i>)}
        {Array.from({ length: startDow }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: dim }, (_, i) => {
          const d = i + 1;
          const key = `${y}-${pad(m + 1)}-${pad(d)}`;
          const has = (byDate[key] ?? []).length > 0;
          return (
            <button key={key} className={`md${key === todayKey ? ' today' : ''}${has ? ' has' : ''}`} aria-label={`${d} ${MONTHS[m]}`}
              onClick={() => { gotoMonth(y, m); openDay(key); }}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}
