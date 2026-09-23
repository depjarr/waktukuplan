'use client';
import { DAYNAMES, MSHORT, addDays, isPastEvent, parseYmd } from '@/lib/dates';
import type { EventRow } from '@/lib/types';
import { EventCard } from './EventCard';
import { usePlanner } from './PlannerProvider';

/** Isi satu kolom hari; menyisipkan garis "sekarang" di kolom hari ini. */
export function EventList({ list, isToday }: { list: EventRow[]; isToday: boolean }) {
  const n = new Date();
  const hm = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  const nodes: React.ReactNode[] = [];
  let placed = false;
  const line = <div key="now" className="nowline">sekarang {hm}</div>;
  list.forEach((e) => {
    if (isToday && !placed && e.kind !== 'text' && e.start_time && e.start_time > hm) { nodes.push(line); placed = true; }
    nodes.push(<EventCard key={e.id} e={e} isPast={isToday && e.kind !== 'text' && isPastEvent(e, n)} />);
  });
  if (isToday && !placed && list.length) nodes.push(line);
  return <>{nodes}</>;
}

/** Tampilan itinerari: 7 kolom hari berdampingan (seperti referensi pict 3). */
export function ItineraryView() {
  const { view, patchView, byDate, todayKey, openEvent, openDay, dayTitles } = usePlanner();
  const start = parseYmd(view.itinStart);
  const last = parseYmd(addDays(view.itinStart, 6));
  const range = `${start.getDate()} ${MSHORT[start.getMonth()]} sampai ${last.getDate()} ${MSHORT[last.getMonth()]} ${last.getFullYear()}`;

  return (
    <div>
      <div className="itinhead">
        <button className="rnd" aria-label="Minggu sebelumnya" onClick={() => patchView({ itinStart: addDays(view.itinStart, -7) })}>‹</button>
        <b>{range}</b>
        <button className="rnd" aria-label="Minggu berikutnya" onClick={() => patchView({ itinStart: addDays(view.itinStart, 7) })}>›</button>
        <button className="btn small" onClick={() => patchView({ itinStart: todayKey })}>Mulai dari hari ini</button>
      </div>
      <div className="itin">
        {Array.from({ length: 7 }, (_, i) => {
          const key = addDays(view.itinStart, i);
          const d = parseYmd(key);
          const list = byDate[key] ?? [];
          const count = list.filter((e) => e.kind !== 'text').length;
          return (
            <section key={key} className={`icol${key === todayKey ? ' today' : ''}`}>
              <header className="ihead">
                <div className="irow1">
                  <div className="idate"><b>{d.getDate()}</b><span>{DAYNAMES[d.getDay()]}, {MSHORT[d.getMonth()]}</span></div>
                  <div className="mini-btn">
                    <button className="plus" title="Tambah jadwal" aria-label="Tambah jadwal" onClick={() => openEvent({ date: key })}>+</button>
                    <button title="Alat lain untuk hari ini" aria-label="Alat lain" onClick={() => openDay(key)}>⋯</button>
                  </div>
                </div>
                <input
                  className="dtitle" maxLength={40} placeholder="Judul hari, misal: Hari santai" aria-label="Judul hari"
                  value={dayTitles.titles[key] ?? ''}
                  onChange={(e) => dayTitles.setLocal(key, e.target.value)}
                  onBlur={(e) => dayTitles.persist(key, e.target.value)}
                />
                <div className="icount">{count ? `${count} jadwal` : 'belum ada jadwal'}</div>
              </header>
              <div className="ilist"><EventList list={list} isToday={key === todayKey} /></div>
            </section>
          );
        })}
      </div>
    </div>
  );
}