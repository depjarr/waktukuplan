'use client';
import { useRef, useState } from 'react';
import type { NoteItem } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

/** Catatan checklist. Bisa ditempel di kanan, ngambang (bisa digeser), atau disembunyikan. */
export function NotesPanel() {
  const { notes, ui, updateUi, toast } = usePlanner();
  const [draft, setDraft] = useState('');
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const list = [...notes.rows].sort((a, b) => a.position - b.position);
  const note = list.find((n) => n.id === ui.activeNote) ?? list[0];
  if (!note) return null;

  const float = ui.notes === 'float';
  const setItems = (items: NoteItem[]) => notes.updateDebounced(note.id, { items });

  function addLine() {
    const t = draft.trim();
    if (!t) return;
    setItems([...note.items, { t, ck: ui.nCheck, done: false }]);
    setDraft('');
  }

  async function newNote() {
    const row = await notes.insert({ title: 'Catatan baru', items: [], position: list.length });
    updateUi({ activeNote: row.id });
  }

  function deleteNote() {
    if (list.length === 1) { notes.updateDebounced(note.id, { title: 'Catatan', items: [] }); return; }
    const backup = note;
    notes.remove([note.id]);
    updateUi({ activeNote: list.find((n) => n.id !== note.id)?.id ?? null });
    toast('Catatan dihapus', { undo: () => notes.upsertMany([backup]) });
  }

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if (!float || (e.target as HTMLElement).closest('button,input')) return;
    const r = elRef.current!.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || !elRef.current) return;
    elRef.current.style.left = `${Math.max(4, Math.min(window.innerWidth - 320, d.ox + e.clientX - d.sx))}px`;
    elRef.current.style.top = `${Math.max(4, Math.min(window.innerHeight - 120, d.oy + e.clientY - d.sy))}px`;
  }
  function onDragEnd() {
    if (!dragRef.current || !elRef.current) return;
    dragRef.current = null;
    updateUi({ nx: parseFloat(elRef.current.style.left), ny: parseFloat(elRef.current.style.top) });
  }

  const style = float
    ? { left: Math.max(4, Math.min(ui.nx ?? (typeof window !== 'undefined' ? window.innerWidth - 340 : 40), (typeof window !== 'undefined' ? window.innerWidth : 1200) - 320)), top: ui.ny ?? 170 }
    : undefined;

  return (
    <div className={`notes${float ? ' float' : ''}`} ref={elRef} style={style}>
      <div className="nhead" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}>
        <div className="ntabs">
          {list.map((n) => (
            <button key={n.id} className="ntab" aria-pressed={n.id === note.id} onClick={() => updateUi({ activeNote: n.id })}>{n.title || 'Tanpa judul'}</button>
          ))}
          <button className="plus" title="Catatan baru" aria-label="Catatan baru" onClick={newNote}>+</button>
        </div>
        <div className="nctl">
          <button title={float ? 'Tempel ke kanan' : 'Ngambang'} aria-label="Ubah posisi catatan" onClick={() => updateUi({ notes: float ? 'dock' : 'float' })}>{float ? '📌' : '🪁'}</button>
          <button title="Sembunyikan" aria-label="Sembunyikan catatan" onClick={() => { updateUi({ notes: 'hidden' }); toast('Catatan disembunyikan. Buka lagi lewat tombol 📝 di atas.'); }}>–</button>
        </div>
      </div>

      <input className="ntitle" value={note.title} placeholder="Judul catatan" aria-label="Judul catatan"
        onChange={(e) => notes.updateDebounced(note.id, { title: e.target.value })} />

      <div className="nadd">
        <input value={draft} placeholder="Tulis baris baru, lalu Enter" aria-label="Baris baru"
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addLine(); }} />
        <button className="chip" aria-pressed={ui.nCheck} title="Baris baru pakai ceklis" onClick={() => updateUi({ nCheck: !ui.nCheck })}>☑ ceklis</button>
      </div>

      <ul className="nlist">
        {note.items.length === 0 && <li className="empty" style={{ textAlign: 'left', padding: '2px 0' }}>Belum ada isi. Tulis di atas.</li>}
        {note.items.map((it, i) => (
          <li key={i} className={`nrow${it.done ? ' done' : ''}`}>
            {it.ck
              ? <button className={`ck${it.done ? ' on' : ''}`} role="checkbox" aria-checked={it.done} aria-label="Ceklis" onClick={() => setItems(note.items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>✓</button>
              : <span className="bul">•</span>}
            <input className="tx" value={it.t} aria-label="Isi catatan"
              onChange={(e) => setItems(note.items.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
            <button className="rm" aria-label="Hapus baris" onClick={() => setItems(note.items.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
      <div className="nfoot"><button onClick={deleteNote}>Hapus catatan ini</button></div>
    </div>
  );
}
