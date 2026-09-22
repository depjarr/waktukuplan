'use client';
import { useMemo, useState } from 'react';
import { catIcon } from '@/lib/categories';
import { relDate } from '@/lib/dates';
import { cmpEvent, usePlanner } from './PlannerProvider';

/** 5 jadwal terdekat yang belum selesai. Dicentang => hilang & diganti jadwal berikutnya. */
export function SoonList() {
  const { events, todayKey, openEvent, saveEvent } = usePlanner();
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const list = useMemo(
    () => events
      .filter((e) => e.kind !== 'text' && (!e.done || leaving.has(e.id)) && e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date) || cmpEvent(a, b))
      .slice(0, 5),
    [events, todayKey, leaving],
  );

  function check(id: string) {
    setLeaving((s) => new Set(s).add(id));
    saveEvent(id, { done: true });
    setTimeout(() => setLeaving((s) => { const n = new Set(s); n.delete(id); return n; }), 700);
  }

  return (
    <div className="card">
      <div className="ctitle"><h2>Segera hadir</h2><small>maks. 5</small></div>
      <ul className="soon">
        {list.length === 0 && (
          <li className="empty">Semua beres.<br />Belum ada jadwal dekat. Tambah lewat toolbar, atau tombol cepat di bawah.</li>
        )}
        {list.map((e) => (
          <li key={e.id} className={`srow cat-${e.category}${leaving.has(e.id) ? ' leaving' : ''}`}>
            <button className="ck" role="checkbox" aria-checked={false} aria-label={`Tandai selesai: ${e.title}`} onClick={() => check(e.id)}>✓</button>
            <button className="sbody" onClick={() => openEvent({ id: e.id })}>
              <span className="stitle">{catIcon(e)} {e.title}</span>
              <span className="swhen">{relDate(e.date, todayKey)}{e.start_time ? `, ${e.start_time}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
