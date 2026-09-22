'use client';
import { useState } from 'react';
import { CATEGORIES, CAT_ICON } from '@/lib/categories';
import { addDays, isTime, toMin, ymd } from '@/lib/dates';
import { resizeImage, uploadImage } from '@/lib/image';
import type { Category, EventRow } from '@/lib/types';
import { Modal } from './Modal';
import { usePlanner } from './PlannerProvider';

const REMINDERS = [
  ['5m', '5 menit sebelumnya'], ['15m', '15 menit sebelumnya'], ['30m', '30 menit sebelumnya'],
  ['1h', '1 jam sebelumnya'], ['3h', '3 jam sebelumnya'],
  ['1d', '1 hari sebelumnya'], ['3d', '3 hari sebelumnya'],
];

/** Form tambah/ubah jadwal (manual). Dibuat ulang tiap dibuka, jadi selalu mulai bersih. */
function EventForm({ existing, presetDate }: { existing: EventRow | null; presetDate?: string }) {
  const p = usePlanner();
  const e = existing;
  const [title, setTitle] = useState(e?.title ?? '');
  const [category, setCategory] = useState<Category>(e?.category ?? 'Meeting');
  const [catName, setCatName] = useState(e?.category_name ?? '');
  const [date, setDate] = useState(e?.date ?? presetDate ?? p.todayKey);
  const [start, setStart] = useState(e?.start_time ?? '');
  const [end, setEnd] = useState(e?.end_time ?? '');
  const [place, setPlace] = useState(e?.place ?? '');
  const [note, setNote] = useState(e?.note ?? '');
  const [remind, setRemind] = useState<string[]>(e?.remind ?? []);
  const [starred, setStarred] = useState(e?.starred ?? false);
  const [image, setImage] = useState(e?.image_url ?? '');
  const [busy, setBusy] = useState(false);

  function toggleRemind(v: string) {
    setRemind((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]));
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setImage(await uploadImage(p.sb, p.userId, await resizeImage(file, 480, false)));
    } catch {
      p.toast('Gambar gagal diunggah');
    }
    setBusy(false);
  }

  async function save() {
    if (!title.trim()) return p.toast('Judul jadwal belum diisi');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return p.toast('Pilih tanggalnya dulu');
    const st = isTime(start) ? start : null;
    let en = isTime(end) ? end : null;
    if (st && en && toMin(en) <= toMin(st)) en = null;
    const data = {
      title: title.trim(), date, start_time: st, end_time: en, category,
      category_name: category === 'Lainnya' ? catName.trim() || null : null,
      place: place.trim() || null, note: note.trim() || null, remind, starred, image_url: image || null,
    };
    if (e) {
      await p.saveEvent(e.id, data);
      p.toast('Jadwal diperbarui');
    } else {
      const row = await p.addEvent(data);
      if (row) {
        p.flashIds([row.id]);
        p.toast(`Jadwal ditambahkan`);
      }
    }
    const [y, m] = date.split('-').map(Number);
    if (y !== p.view.year || m - 1 !== p.view.month) p.gotoMonth(y, m - 1);
    p.closeEvent();
  }

  return (
    <div className="dlg">
      <div className="dhead"><h3 id="evHead">{e ? 'Ubah jadwal' : 'Tambah jadwal'}</h3><button className="x" aria-label="Tutup" onClick={p.closeEvent}>✕</button></div>
      <div className="fgrid">
        <label className="fld span2"><span>Judul</span>
          <input autoFocus type="text" maxLength={200} placeholder="Misal: Meeting klien" value={title}
            onChange={(ev) => setTitle(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') save(); }} />
        </label>
        <label className="fld"><span>Kategori</span>
          <select value={category} onChange={(ev) => setCategory(ev.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICON[c]} {c === 'Lainnya' ? 'Lainnya (tulis sendiri)' : c}</option>)}
          </select>
        </label>
        {category === 'Lainnya' && (
          <label className="fld"><span>Nama kategori</span>
            <input type="text" maxLength={24} placeholder="Misal: Olahraga" value={catName} onChange={(ev) => setCatName(ev.target.value)} />
          </label>
        )}
        <div className="fld span2"><span>Tanggal</span>
          <div className="row">
            <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
            {([['Hari ini', 0], ['Besok', 1], ['Lusa', 2]] as const).map(([l, n]) => (
              <button key={l} className="chip" onClick={() => setDate(addDays(ymd(new Date()), n))}>{l}</button>
            ))}
          </div>
        </div>
        <div className="fld span2"><span>Jam</span>
          <div className="row">
            <input type="time" aria-label="Jam mulai" value={start} onChange={(ev) => setStart(ev.target.value)} />
            <em>sampai</em>
            <input type="time" aria-label="Jam selesai" value={end} onChange={(ev) => setEnd(ev.target.value)} />
          </div>
          <div className="row">
            {([['Pagi', '08:00'], ['Siang', '12:00'], ['Sore', '16:00'], ['Malam', '19:00']] as const).map(([l, t]) => (
              <button key={l} className="chip" onClick={() => setStart(t)}>{l}</button>
            ))}
            <button className="chip" onClick={() => { setStart(''); setEnd(''); }}>Tanpa jam</button>
          </div>
        </div>
        <label className="fld span2"><span>Lokasi</span>
          <input type="text" maxLength={200} placeholder="Misal: Kantor, Istora Senayan" value={place} onChange={(ev) => setPlace(ev.target.value)} />
        </label>
        <label className="fld span2"><span>Catatan</span>
          <textarea rows={2} maxLength={500} placeholder="Tulis apa saja yang perlu diingat" value={note} onChange={(ev) => setNote(ev.target.value)} />
        </label>
        <div className="fld span2"><span>Pengingat</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {REMINDERS.map(([v, l]) => (
              <button key={v} type="button" className="chip" aria-pressed={remind.includes(v)} onClick={() => toggleRemind(v)}>
                {remind.includes(v) ? '✓ ' : ''}{l}
              </button>
            ))}
          </div>
        </div>
        <div className="fld"><span>Penanda</span>
          <div className="row"><button className="chip" aria-pressed={starred} onClick={() => setStarred((s) => !s)}>{starred ? '★' : '☆'} Penting</button></div>
        </div>
        <div className="fld span2"><span>Gambar (boleh dikosongkan)</span>
          <div className="row">
            <label className="btn small">{busy ? 'Mengunggah…' : 'Pilih gambar'}
              <input type="file" accept="image/*" hidden disabled={busy} onChange={(ev) => { pickImage(ev.target.files?.[0]); ev.target.value = ''; }} />
            </label>
            {image && <div className="prev" style={{ backgroundImage: `url("${image}")` }} />}
            {image && <button className="chip" onClick={() => setImage('')}>Hapus gambar</button>}
          </div>
        </div>
      </div>
      <div className="dfoot">
        {e && <button className="btn danger" onClick={() => { p.closeEvent(); p.removeEvent(e.id); }}>Hapus</button>}
        <span className="grow" />
        <button className="btn" onClick={p.closeEvent}>Batal</button>
        <button className="btn primary" onClick={save} disabled={busy}>Simpan</button>
      </div>
    </div>
  );
}

export function EventDialog() {
  const { eventDlg, closeEvent, events } = usePlanner();
  const existing = eventDlg?.id ? events.find((x) => x.id === eventDlg.id) ?? null : null;
  return (
    <Modal open={!!eventDlg} onClose={closeEvent} labelledBy="evHead">
      <EventForm existing={existing} presetDate={eventDlg?.date} />
    </Modal>
  );
}