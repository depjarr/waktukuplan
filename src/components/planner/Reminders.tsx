'use client';
import { fmtDate, pad } from '@/lib/dates';
import { cmpEvent, usePlanner } from './PlannerProvider';

/** Jadwal bertanda ★ pada bulan yang tampil di kalender mini. */
export function Reminders() {
  const { events, mini, openEvent, toggleDone } = usePlanner();
  const prefix = `${mini.y}-${pad(mini.m + 1)}`;
  const list = events
    .filter((e) => e.starred && e.kind !== 'text' && e.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date) || cmpEvent(a, b));

  return (
    <div className="card">
      <div className="ctitle"><h2>Pengingat bulan ini</h2></div>
      <ul className="rem">
        {list.length === 0 && <li className="empty">Tandai jadwal dengan ★ supaya muncul di sini.</li>}
        {list.map((e) => (
          <li key={e.id} className="rrow">
            <button className={`ck${e.done ? ' on' : ''}`} role="checkbox" aria-checked={e.done} aria-label={`Tandai selesai: ${e.title}`} onClick={() => toggleDone(e.id)}>✓</button>
            <button className="sbody" onClick={() => openEvent({ id: e.id })}>
              <span className="stitle" style={e.done ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{e.title}</span>
            </button>
            <span className="rdate">{fmtDate(e.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
