'use client';
import { Icon } from '@/components/Icon';
import { useEffect, useRef, useState } from 'react';
import type { StickerRow } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function Sticker({ s, stageRef }: { s: StickerRow; stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { view, patchView, stickers } = usePlanner();
  const [pos, setPos] = useState({ x: s.x, y: s.y });
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const selected = view.selSticker === s.id;

  useEffect(() => { setPos({ x: s.x, y: s.y }); }, [s.x, s.y]);

  // mulai mengedit teks: fokus & blok semua
  useEffect(() => {
    if (!editing || !textRef.current) return;
    const el = textRef.current;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }, [editing]);

  // sticker teks baru langsung masuk mode edit
  useEffect(() => { if (s.type === 'text' && s.text_content === 'tulis di sini' && selected) setEditing(true); }, [s.type, s.text_content, selected]);

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.stbar')) return;
    patchView({ selSticker: s.id });
    if (editing) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = s.x, oy = s.y;
    let moved = false, last = { x: ox, y: oy };
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 3) moved = true;
      last = { x: clamp(ox + ((ev.clientX - sx) / r.width) * 100, -4, 100), y: clamp(oy + ((ev.clientY - sy) / r.height) * 100, -6, 100) };
      setPos(last);
    };
    const up = () => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (moved) stickers.update(s.id, last).catch(() => undefined);
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    e.preventDefault();
  }

  function finishEdit() {
    setEditing(false);
    const v = (textRef.current?.innerText ?? '').replace(/\n+$/, '').trim();
    if (!v) { stickers.remove([s.id]); patchView({ selSticker: null }); }
    else if (v !== s.text_content) stickers.update(s.id, { text_content: v });
  }

  const act = (a: string) => {
    if (a === 'rm') { stickers.remove([s.id]); patchView({ selSticker: null }); }
    else if (a === 'up' || a === 'dn') {
      const f = a === 'up' ? 1.14 : 1 / 1.14;
      if (s.type === 'img') stickers.update(s.id, { w: clamp((s.w ?? 12) * f, 3, 70) });
      else stickers.update(s.id, { fs: clamp((s.fs ?? 32) * f, 12, 180) });
    } else if (a === 'rl') stickers.update(s.id, { rot: s.rot - 10 });
    else if (a === 'rr') stickers.update(s.id, { rot: s.rot + 10 });
    else if (a === 'fr') stickers.update(s.id, { z: Math.max(...stickers.rows.map((r) => r.z), 1) + 1 });
    else if (a === 'ed') setEditing(true);
  };

  return (
    <div
      className={`sticker ${s.type}${selected ? ' sel' : ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: s.z, width: s.type === 'img' ? `${s.w ?? 12}%` : undefined }}
      onPointerDown={onDown}
      onDoubleClick={() => { if (s.type === 'text') setEditing(true); }}
    >
      <div className="sbd" style={{ transform: `rotate(${s.rot}deg)`, fontSize: s.type === 'img' ? undefined : `${s.fs ?? 32}px` }}>
        {s.type === 'img' && s.src && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.src} alt="" draggable={false} />}
        {s.type === 'emoji' && s.ch}
        {s.type === 'text' && (
          <span
            ref={textRef} className="stxt" style={{ color: s.color ?? '#E4708C' }}
            contentEditable={editing} suppressContentEditableWarning
            onBlur={finishEdit}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') e.currentTarget.blur(); }}
          >{s.text_content}</span>
        )}
      </div>
      <div className="stbar">
        <button aria-label="Kecilkan" onClick={() => act('dn')}>−</button>
        <button aria-label="Besarkan" onClick={() => act('up')}>+</button>
        <button aria-label="Putar kiri" onClick={() => act('rl')}>↺</button>
        <button aria-label="Putar kanan" onClick={() => act('rr')}>↻</button>
        <button aria-label="Ke depan" onClick={() => act('fr')}>⇧</button>
        {s.type === 'text' && <button aria-label="Ubah teks" onClick={() => act('ed')}><Icon n="pencil" size={14} /></button>}
        <button aria-label="Hapus" onClick={() => act('rm')}><Icon n="trash" size={14} /></button>
      </div>
    </div>
  );
}

/** Lapisan stiker, gambar, dan teks ngambang untuk bulan yang sedang dibuka. */
export function StickerLayer({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { stickers, ym, ui, view, patchView } = usePlanner();
  const list = stickers.rows.filter((s) => s.ym === ym);

  // Delete / Backspace menghapus stiker terpilih; Esc membatalkan pilihan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.key === 'Escape') patchView({ selSticker: null });
      if (view.selSticker && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        stickers.remove([view.selSticker]);
        patchView({ selSticker: null });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view.selSticker, stickers, patchView]);

  return (
    <div className={`stickers${ui.stickers ? '' : ' off'}`}>
      {list.map((s) => <Sticker key={s.id} s={s} stageRef={stageRef} />)}
    </div>
  );
}
