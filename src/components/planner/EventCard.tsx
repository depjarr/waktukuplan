'use client';
import { Icon } from '@/components/Icon';
import { catIcon, catLabel } from '@/lib/categories';
import { duration } from '@/lib/dates';
import type { EventRow } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

/** Kartu jadwal ala itinerari (dipakai di kolom itinerari dan jendela detail hari).
 *  isPast: jamnya sudah lewat tapi belum ditandai selesai -> dipudarkan, beda dari "done". */
export function EventCard({ e, isPast }: { e: EventRow; isPast?: boolean }) {
  const { openEvent, toggleDone, toggleStar, removeEvent, flash } = usePlanner();

  if (e.kind === 'text') {
    return (
      <div className="icard txt" onClick={() => openEvent({ id: e.id })}>
        <div className="ibody"><div className="ititle">{e.title}</div></div>
        <div className="iact"><button title="Hapus" aria-label="Hapus" onClick={(ev) => { ev.stopPropagation(); removeEvent(e.id); }}><Icon n="trash" size={14} /></button></div>
      </div>
    );
  }
  const d = duration(e.start_time, e.end_time);
  const stop = (fn: () => void) => (ev: React.MouseEvent) => { ev.stopPropagation(); fn(); };
  return (
    <div className={`icard cat-${e.category}${e.done ? ' done' : ''}${!e.done && isPast ? ' past' : ''}${flash.has(e.id) ? ' flash' : ''}`} onClick={() => openEvent({ id: e.id })}>
      {e.image_url && <div className="ithumb" style={{ backgroundImage: `url("${e.image_url}")` }} />}
      <div className="ibody">
        <div className="imeta">
          <span>{catIcon(e)} {catLabel(e)}</span>
          {e.start_time && <span>{e.start_time}{e.end_time ? ` - ${e.end_time}` : ''}</span>}
          {d && <span>{d}</span>}
          {!e.done && isPast && <span className="past-tag">Terlewat</span>}
        </div>
        <div className="ititle">{e.title}</div>
        {e.place && <div className="iplace"><Icon n="pin" size={13} /> {e.place}</div>}
      </div>
      <div className="iact">
        <button className={e.done ? 'on' : ''} title="Tandai selesai" aria-label="Tandai selesai" aria-pressed={e.done} onClick={stop(() => toggleDone(e.id))}>✓</button>
        <button className={e.starred ? 'on' : ''} title="Penting" aria-label="Tandai penting" aria-pressed={e.starred} onClick={stop(() => toggleStar(e.id))}>★</button>
        <button title="Hapus" aria-label="Hapus" onClick={stop(() => removeEvent(e.id))}><Icon n="trash" size={14} /></button>
      </div>
    </div>
  );
}