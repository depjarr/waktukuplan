'use client';
import { Icon } from '@/components/Icon';
import { DAYNAMES, MONTHS, parseYmd } from '@/lib/dates';
import { useDayActions } from './DayCell';
import { EventList } from './ItineraryView';
import { Modal } from './Modal';
import { usePlanner } from './PlannerProvider';

/** Rincian satu hari: kartu jadwal ala itinerari + alat manual di bagian atas. */
export function DayDialog() {
  const { dayDlg, closeDay, byDate, todayKey } = usePlanner();
  const { run, uploadToDate, fileRef } = useDayActions();
  const date = dayDlg ?? '';
  const d = date ? parseYmd(date) : null;
  const list = byDate[date] ?? [];

  return (
    <Modal open={!!dayDlg} onClose={closeDay} wide labelledBy="dayTitle">
      {d && (
        <div className="dlg">
          <div className="dhead">
            <h3 id="dayTitle">{DAYNAMES[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}</h3>
            <button className="x" aria-label="Tutup" onClick={closeDay}>✕</button>
          </div>
          <div className="daybar">
            <button className="btn primary" onClick={() => run('add', date)}>+ Tambah jadwal</button>
            <button className="btn" onClick={() => run('text', date)}><Icon n="type" /> Teks</button>
            <button className="btn" onClick={() => run('pen', date)}><Icon n="pencil" /> Pensil</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Icon n="image" /> Gambar</button>
            <button className="btn" onClick={() => run('clear', date)}><Icon n="eraser" /> Kosongkan hari</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadToDate(date, f); }} />
          </div>
          <div className="daybody">
            {list.length === 0
              ? <div className="empty">Belum ada jadwal di hari ini.<br />Tambah manual lewat tombol di atas, atau ketik ke AI.</div>
              : <EventList list={list} isToday={date === todayKey} />}
          </div>
        </div>
      )}
    </Modal>
  );
}
