'use client';
import { useRef } from 'react';
import { Icon } from '@/components/Icon';
import { catIcon } from '@/lib/categories';
import { fmtDate } from '@/lib/dates';
import { resizeImage, uploadImage } from '@/lib/image';
import type { EventRow } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

/** Aksi tombol mini di tiap tanggal (dipakai juga oleh jendela detail hari). */
export function useDayActions() {
  const p = usePlanner();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const run = (act: 'add' | 'text' | 'pen' | 'img' | 'clear', date: string, pickImage?: () => void) => {
    if (act === 'add') p.openEvent({ date });
    else if (act === 'text') {
      p.ask({
        title: `Tulis teks untuk ${fmtDate(date)}`, placeholder: 'Catatan singkat…',
        onOk: (v) => { p.addEvent({ title: v, date, kind: 'text' }); },
      });
    } else if (act === 'pen') {
      p.closeDay();
      p.setTool('pencil');
    } else if (act === 'img') pickImage?.();
    else if (act === 'clear') p.clearDay(date);
  };

  /** Unggah gambar lalu taruh sebagai stiker di sekitar tanggal itu. */
  const uploadToDate = async (date: string, file: File) => {
    try {
      const src = await uploadImage(p.sb, p.userId, await resizeImage(file, 520, true));
      const [y, m] = date.split('-').map(Number);
      if (y !== p.view.year || m - 1 !== p.view.month) p.gotoMonth(y, m - 1);
      if (p.view.mode !== 'month') p.setMode('month');
      p.closeDay();
      const cell = document.querySelector<HTMLElement>(`.cell[data-date="${date}"]`);
      const stage = document.querySelector<HTMLElement>('.stage');
      let x = 25 + Math.random() * 30, y2 = 12 + Math.random() * 30;
      if (cell && stage) {
        const sr = stage.getBoundingClientRect(), cr = cell.getBoundingClientRect();
        x = Math.min(90, Math.max(0, ((cr.left - sr.left + cr.width * 0.15) / sr.width) * 100));
        y2 = Math.min(90, Math.max(0, ((cr.top - sr.top + cr.height * 0.2) / sr.height) * 100));
      }
      await p.addSticker({ type: 'img', src, x, y: y2, w: 9, rot: Math.round(Math.random() * 10 - 5) });
      p.toast('Gambar ditambahkan. Geser ke mana pun kamu mau');
    } catch {
      p.toast('Gambar gagal diunggah');
    }
  };
  return { run, uploadToDate, fileRef };
}

function CellEvents({ list }: { list: EventRow[] }) {
  const { openEvent, flash } = usePlanner();
  if (!list.length) return null;
  const fl = (e: EventRow) => (flash.has(e.id) ? ' flash' : '');

  const text = (e: EventRow) => (
    <button key={e.id} className={`ev txt${fl(e)}`} onClick={(ev) => { ev.stopPropagation(); openEvent({ id: e.id }); }}>
      <span className="t">{e.title}</span>
    </button>
  );

  if (list.length === 1) {
    const e = list[0];
    if (e.kind === 'text') return text(e);
    return (
      <button className={`ev single cat-${e.category}${e.done ? ' done' : ''}${fl(e)}`} title={e.title}
        onClick={(ev) => { ev.stopPropagation(); openEvent({ id: e.id }); }}>
        {e.image_url ? <span className="thumb" style={{ backgroundImage: `url("${e.image_url}")` }} /> : catIcon(e) ? <span className="ico">{catIcon(e)}</span> : null}
        <span className="t">{e.start_time && <b>{e.start_time} </b>}{e.title}</span>
      </button>
    );
  }
  return (
    <>
      {list.slice(0, 3).map((e) => e.kind === 'text' ? text(e) : (
        <button key={e.id} className={`ev pill cat-${e.category}${e.done ? ' done' : ''}${fl(e)}`} title={e.title}
          onClick={(ev) => { ev.stopPropagation(); openEvent({ id: e.id }); }}>
          {catIcon(e) && <span className="ico">{catIcon(e)}</span>}
          <span className="t">{e.start_time && <b>{e.start_time} </b>}{e.title}</span>
        </button>
      ))}
      {list.length > 3 && <span className="more">+{list.length - 3} lagi</span>}
    </>
  );
}

export function DayCell({ date, dayNum, out, col, list }: {
  date: string; dayNum: number; out: boolean; col: number; list: EventRow[];
}) {
  const { todayKey, view, openDay } = usePlanner();
  const { run, uploadToDate, fileRef } = useDayActions();
  const cls = `cell${out ? ' out' : ''}${date === todayKey ? ' today' : ''}${col === 0 ? ' col0' : ''}${col === 6 ? ' col6' : ''}`;

  return (
    <div className={cls} data-date={date} onClick={() => { if (view.tool === 'select') openDay(date); }}>
      <div className="chead">
        <span className="num">{dayNum}</span>
        {list.length > 1 && <span className="cnt" aria-label={`${list.length} jadwal`}>{list.length}</span>}
      </div>
      <div className="cbody"><CellEvents list={list} /></div>
      <div className="cell-tools" role="toolbar" aria-label="Alat tanggal" onClick={(e) => e.stopPropagation()}>
        <button title="Tambah jadwal" aria-label="Tambah jadwal" onClick={() => run('add', date)}>+</button>
        <button title="Tulis teks" aria-label="Tulis teks" onClick={() => run('text', date)}>T</button>
        <button title="Corat-coret" aria-label="Pensil" onClick={() => run('pen', date)}><Icon n="pencil" size={14} /></button>
        <button title="Tambah gambar" aria-label="Tambah gambar" onClick={() => fileRef.current?.click()}><Icon n="image" size={14} /></button>
        <button title="Kosongkan hari" aria-label="Kosongkan hari" onClick={() => run('clear', date)}>⌫</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadToDate(date, f); }} />
      </div>
    </div>
  );
}
