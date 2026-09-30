'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useDayDrawing } from '@/hooks/useDayDrawing';
import { useTable } from '@/hooks/useTable';
import { PEN_COLORS, STICKER_EMOJIS } from '@/lib/categories';
import { DAYNAMES, MONTHS, parseYmd } from '@/lib/dates';
import { resizeImage, uploadImage } from '@/lib/image';
import type { DayStickerRow, Stroke, Tool } from '@/lib/types';
import { useDayActions } from './DayCell';
import { DayDrawLayer } from './DayDrawLayer';
import { DayStickerLayer } from './DayStickerLayer';
import { EventList } from './ItineraryView';
import { Modal } from './Modal';
import { Popover } from './Popover';
import { usePlanner } from './PlannerProvider';

/**
 * Jurnal per-hari untuk dialog "Alat lain" di tampilan itinerari.
 * Tabel & state SENGAJA dipisah dari versi bulan (day_stickers/day_drawings,
 * bukan stickers/drawings) — biar dua tampilan gak saling ganggu.
 */
export function DayDialog() {
  const p = usePlanner();
  const { dayDlg, closeDay, byDate, todayKey, sb, userId, toast } = p;
  const { run } = useDayActions();
  const date = dayDlg ?? '';
  const d = date ? parseYmd(date) : null;
  const list = byDate[date] ?? [];

  const dayStickers = useTable<DayStickerRow>('day_stickers', userId);
  const drawing = useDayDrawing(userId, date);
  const dayList = dayStickers.rows.filter((s) => s.date === date);

  const [tool, setLocalTool] = useState<Tool>('select');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(4);
  const [selSticker, setSelSticker] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // alat balik ke "pilih" tiap ganti tanggal / dialog dibuka lagi
  useEffect(() => { setLocalTool('select'); setSelSticker(null); }, [date]);

  async function addDaySticker(s: Partial<DayStickerRow>) {
    const z = dayList.reduce((a, r) => Math.max(a, r.z), 0) + 1;
    const id = crypto.randomUUID();
    setSelSticker(id);
    try {
      await dayStickers.insert({
        id, date, x: 40, y: 10, rot: 0, z, ch: null, text_content: null, src: null, w: null, fs: null, color: null, ...s,
      } as Partial<DayStickerRow>);
    } catch {
      toast('Gagal menyimpan stiker');
    }
  }

  async function onImage(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await resizeImage(file, 520, true);
      const src = await uploadImage(sb, userId, blob);
      await addDaySticker({ type: 'img', src, w: 22, x: 25 + Math.random() * 30, y: 12 + Math.random() * 30, rot: Math.round(Math.random() * 10 - 5) });
      toast('Gambar ditambahkan. Geser ke mana pun kamu mau');
    } catch {
      toast('Gambar gagal diunggah');
    }
  }

  function onStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (tool === 'text' && !target.closest('.sticker') && !target.closest('button')) {
      const r = stageRef.current!.getBoundingClientRect();
      addDaySticker({
        type: 'text', text_content: 'tulis di sini', fs: 24, color: penColor,
        x: Math.max(0, Math.min(92, ((e.clientX - r.left) / r.width) * 100)),
        y: Math.max(0, Math.min(96, ((e.clientY - r.top) / r.height) * 100)),
      });
      setLocalTool('select');
      e.preventDefault();
      return;
    }
    if (!target.closest('.sticker')) setSelSticker(null);
  }

  const toggleTool = (t: Tool) => setLocalTool((cur) => (cur === t ? 'select' : t));
  const undoStroke = () => drawing.save(drawing.strokes.slice(0, -1));
  const clearStrokes = () => {
    const old: Stroke[] = drawing.strokes;
    if (!old.length) return;
    drawing.save([]);
    toast('Coretan hari ini dihapus', { undo: () => drawing.save(old) });
  };

    return (
    <Modal open={!!dayDlg} onClose={closeDay} wide labelledBy="dayTitle">
      {d && (
        <div className="dlg journal">
          <div className="dhead">
            <h3 id="dayTitle">{DAYNAMES[d.getDay()]}, {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}</h3>
            <button className="x" aria-label="Tutup" onClick={closeDay}>✕</button>
          </div>

          <div className="daybar">
            <button className="btn primary" onClick={() => run('add', date)}>+ Tambah jadwal</button>
            <button className="tool" aria-pressed={tool === 'text'} onClick={() => toggleTool('text')}><Icon n="type" /> Teks</button>
            <button className="tool" aria-pressed={tool === 'pencil'} onClick={() => toggleTool('pencil')}><Icon n="pencil" /> Pensil</button>
            <button className="tool" aria-pressed={tool === 'eraser'} onClick={() => toggleTool('eraser')}><Icon n="eraser" /> Penghapus</button>
            <button className="tool" onClick={() => fileRef.current?.click()}><Icon n="image" /> Gambar</button>
            <Popover trigger={(toggle) => <button className="tool tool-drop" onClick={toggle}><Icon n="smile" /> Stiker</button>}>
              {(close) => (
                <div className="emo">
                  {STICKER_EMOJIS.map((ch) => (
                    <button key={ch} aria-label={`Stiker ${ch}`} onClick={() => { addDaySticker({ type: 'emoji', ch, fs: 40, x: 20 + Math.random() * 55, y: 8 + Math.random() * 45, rot: Math.round(Math.random() * 30 - 15) }); close(); }}>{ch}</button>
                  ))}
                </div>
              )}
            </Popover>
            <button className="btn" onClick={() => run('clear', date)}><Icon n="eraser" /> Hapus semua jadwal</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onImage(f); }} />
          </div>

          {(tool === 'pencil' || tool === 'eraser' || tool === 'text') && (
            <div className="penopts">
              <span>{tool === 'eraser' ? 'Ukuran penghapus' : tool === 'text' ? 'Warna teks' : 'Warna'}</span>
              {tool !== 'eraser' && (
                <span className="row">
                  {PEN_COLORS.map((c) => (
                    <button key={c} className="sw" style={{ background: c }} aria-label={`Warna ${c}`} aria-pressed={penColor === c} onClick={() => setPenColor(c)} />
                  ))}
                </span>
              )}
              {tool !== 'text' && (
                <>
                  <label className="row">Tebal <input type="range" min={2} max={18} value={penSize} aria-label="Tebal pensil" onChange={(e) => setPenSize(+e.target.value)} /></label>
                  <button className="chip" onClick={undoStroke}>↶ Urungkan coretan</button>
                  <button className="chip" onClick={clearStrokes}>Hapus semua coretan hari ini</button>
                </>
              )}
            </div>
          )}

          {/* ==== halaman ganda: kiri = daftar jadwal, kanan = halaman kosong buat stiker/gambar/coretan ==== */}
          <div className="jsheet">
            <div className="jpage jpage-left">
              <div className="daybody">
                {list.length === 0
                  ? <div className="empty">Belum ada jadwal di hari ini.<br />Tambah manual lewat tombol di atas, atau ketik ke AI.</div>
                  : <EventList list={list} isToday={date === todayKey} />}
              </div>
            </div>

            <div className="jpage jpage-right" ref={stageRef} data-tool={tool} onPointerDown={onStagePointerDown}>
              {dayList.length === 0 && tool === 'select' && (
                <div className="jp-hint">Halaman kosong — tempel stiker, gambar, atau corat-coret di sini ✦</div>
              )}
              <DayDrawLayer stageRef={stageRef} tool={tool} penColor={penColor} penSize={penSize} strokes={drawing.strokes} onSave={drawing.save} />
              <DayStickerLayer
                stageRef={stageRef} list={dayList} selId={selSticker} onSelect={setSelSticker}
                onUpdate={(id, patch) => dayStickers.update(id, patch)}
                onRemove={(id) => { dayStickers.remove([id]); }}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );

}