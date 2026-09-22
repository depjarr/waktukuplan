'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { FontPicker } from '@/components/FontPicker';
import { Icon, type IconName } from '@/components/Icon';
import { ThemePicker } from '@/components/ThemePicker';
import { PEN_COLORS, STICKER_EMOJIS } from '@/lib/categories';
import { fontStore, HAND_FONTS, UI_FONTS } from '@/lib/fonts';
import { resizeImage, uploadImage } from '@/lib/image';
import { MODE_LABELS, PALETTES, themeStore } from '@/lib/theme';
import type { Stroke, Tool, UiSettings } from '@/lib/types';
import { Popover } from './Popover';
import { usePlanner } from './PlannerProvider';

const TOOLS: { tool: Tool; icon: IconName; label: string; title: string }[] = [
  { tool: 'text', icon: 'type', label: 'Teks', title: 'Taruh teks ngambang di kalender' },
  { tool: 'pencil', icon: 'pencil', label: 'Pensil', title: 'Corat-coret di kalender' },
  { tool: 'eraser', icon: 'eraser', label: 'Penghapus', title: 'Hapus coretan' },
];

export function Toolbar() {
  const p = usePlanner();
  const { view, ui } = p;
  const fileRef = useRef<HTMLInputElement>(null);
  const [subview, setSubview] = useState<'main' | 'stiker' | 'tema' | 'font' | 'tampilan'>('main');
  const themePref = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.server);
  const pickTheme = (next: typeof themePref) => { themeStore.set(next); p.updateUi({ theme: next }); };
  const fontPref = useSyncExternalStore(fontStore.subscribe, fontStore.get, fontStore.server);
  const pickFont = (next: typeof fontPref) => { fontStore.set(next); p.updateUi({ font: next }); };

  async function onImage(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await resizeImage(file, 520, true);
      const src = await uploadImage(p.sb, p.userId, blob);
      if (view.mode !== 'month') p.setMode('month');
      await p.addSticker({ type: 'img', src, w: 16, x: 25 + Math.random() * 30, y: 12 + Math.random() * 30, rot: Math.round(Math.random() * 10 - 5) });
      p.toast('Gambar ditambahkan. Geser ke mana pun kamu mau');
    } catch {
      p.toast('Gambar gagal diunggah');
    }
  }

  const undoStroke = () => p.drawing.save(p.drawing.strokes.slice(0, -1));
  const clearStrokes = () => {
    const old: Stroke[] = p.drawing.strokes;
    if (!old.length) return;
    p.drawing.save([]);
    p.toast('Semua coretan bulan ini dihapus', { undo: () => p.drawing.save(old) });
  };

  const setNotes = (notes: UiSettings['notes']) => p.updateUi({ notes });
  const chip = (on: boolean) => ({ 'aria-pressed': on });

  return (
    <nav className="tools" aria-label="Alat jurnal">
      <div className="trow">
        <button className="btn primary" onClick={() => p.openEvent({})}>+ Tambah jadwal</button>
        <span className="sep" />

        {/* ===== Versi desktop: tombol satu-satu, TIDAK diubah ===== */}
        <div className="toolgrp-full">
          {TOOLS.map((t) => (
            <button key={t.tool} className="tool" title={t.title} aria-pressed={view.tool === t.tool} onClick={() => p.setTool(t.tool)}>
              <Icon n={t.icon} /> <span className="lbl">{t.label}</span>
            </button>
          ))}
          <button className="tool" title="Tambah gambar ngambang" onClick={() => fileRef.current?.click()}><Icon n="image" /> <span className="lbl">Gambar</span></button>

          <Popover trigger={(toggle) => <button className="tool tool-drop" title="Stiker" onClick={toggle}><Icon n="smile" /> <span className="lbl">Stiker</span></button>}>
            {(close) => (
              <div className="emo">
                {STICKER_EMOJIS.map((ch) => (
                  <button key={ch} aria-label={`Stiker ${ch}`} onClick={() => {
                    if (view.mode !== 'month') p.setMode('month');
                    p.addSticker({ type: 'emoji', ch, fs: 44, x: 20 + Math.random() * 55, y: 8 + Math.random() * 45, rot: Math.round(Math.random() * 30 - 15) });
                    close();
                  }}>{ch}</button>
                ))}
              </div>
            )}
          </Popover>

          <button className="tool" aria-pressed={ui.notes !== 'hidden'} title="Tampilkan atau sembunyikan catatan"
            onClick={() => setNotes(ui.notes === 'hidden' ? 'dock' : 'hidden')}><Icon n="note" /> <span className="lbl">Catatan</span></button>

          <ThemePicker onChange={(theme) => p.updateUi({ theme })} />
          <FontPicker onChange={(font) => p.updateUi({ font })} />

          <Popover align="right" trigger={(toggle) => <button className="tool tool-drop" title="Pengaturan tampilan" onClick={toggle}><Icon n="sliders" /> <span className="lbl">Tampilan</span></button>}>
            {(close) => (
              <div className="vopt">
                <div>
                  <h4>Catatan</h4>
                  <div className="row">
                    {([['dock', 'Di kanan'], ['float', 'Ngambang'], ['hidden', 'Sembunyi']] as const).map(([v, l]) => (
                      <button key={v} className="chip" {...chip(ui.notes === v)} onClick={() => setNotes(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4>Panel</h4>
                  <div className="row">
                    <button className="chip" {...chip(ui.left)} onClick={() => p.updateUi({ left: !ui.left })}>Jam &amp; segera hadir</button>
                    <button className="chip" {...chip(ui.mini)} onClick={() => p.updateUi({ mini: !ui.mini })}>Kalender mini</button>
                    <button className="chip" {...chip(ui.stickers)} onClick={() => p.updateUi({ stickers: !ui.stickers })}>Stiker</button>
                  </div>
                </div>
                <div className="row">
                  <form action="/auth/signout" method="post"><button className="chip" type="submit">Keluar</button></form>
                </div>
              </div>
            )}
          </Popover>
        </div>

        {/* ===== Versi hp/tablet: satu tombol "Tools", isinya list dropdown ===== */}
        <div className="toolgrp-compact">
          <Popover align="right" trigger={(toggle) => (
            <button className="tool tool-drop" title="Alat & pengaturan" onClick={() => { setSubview('main'); toggle(); }}>
              <Icon n="sliders" /> <span className="lbl">Tools</span>
            </button>
          )}>
            {(close) => {
              if (subview === 'stiker') return (
                <div className="tlist">
                  <button className="litem back" onClick={() => setSubview('main')}>‹ Kembali</button>
                  <div className="emo">
                    {STICKER_EMOJIS.map((ch) => (
                      <button key={ch} aria-label={`Stiker ${ch}`} onClick={() => {
                        if (view.mode !== 'month') p.setMode('month');
                        p.addSticker({ type: 'emoji', ch, fs: 44, x: 20 + Math.random() * 55, y: 8 + Math.random() * 45, rot: Math.round(Math.random() * 30 - 15) });
                        setSubview('main'); close();
                      }}>{ch}</button>
                    ))}
                  </div>
                </div>
              );
              if (subview === 'tema') return (
                <div className="tlist">
                  <button className="litem back" onClick={() => setSubview('main')}>‹ Kembali</button>
                  <h4>Mode</h4>
                  <div className="row">
                    {MODE_LABELS.map(([m, label]) => (
                      <button key={m} className="chip" aria-pressed={themePref.m === m} onClick={() => pickTheme({ ...themePref, m })}>{label}</button>
                    ))}
                  </div>
                  <h4>Palet warna</h4>
                  <div className="tp-grid">
                    {PALETTES.map((colors, i) => (
                      <button key={i} className="tp-sw" aria-pressed={themePref.p === i}
                        title={i === 0 ? 'Bawaan' : `Palet ${i}`} aria-label={i === 0 ? 'Palet bawaan' : `Palet ${i}`}
                        onClick={() => pickTheme({ ...themePref, p: i })}>
                        {colors.map((c, j) => <span key={j} style={{ background: c }} />)}
                      </button>
                    ))}
                  </div>
                </div>
              );
              if (subview === 'font') return (
                <div className="tlist">
                  <button className="litem back" onClick={() => setSubview('main')}>‹ Kembali</button>
                  <h4>Font tulisan tangan</h4>
                  <div className="fp-list">
                    {HAND_FONTS.map((f, i) => (
                      <button key={f.label} className="chip fp-opt" aria-pressed={fontPref.hand === i} style={{ fontFamily: f.css }}
                        onClick={() => pickFont({ ...fontPref, hand: i })}>{f.label}</button>
                    ))}
                  </div>
                  <h4>Font UI</h4>
                  <div className="fp-list">
                    {UI_FONTS.map((f, i) => (
                      <button key={f.label} className="chip fp-opt" aria-pressed={fontPref.ui === i} style={{ fontFamily: f.css }}
                        onClick={() => pickFont({ ...fontPref, ui: i })}>{f.label}</button>
                    ))}
                  </div>
                </div>
              );
              if (subview === 'tampilan') return (
                <div className="tlist">
                  <button className="litem back" onClick={() => setSubview('main')}>‹ Kembali</button>
                  <h4>Catatan</h4>
                  <div className="row">
                    {([['dock', 'Di kanan'], ['float', 'Ngambang'], ['hidden', 'Sembunyi']] as const).map(([v, l]) => (
                      <button key={v} className="chip" {...chip(ui.notes === v)} onClick={() => setNotes(v)}>{l}</button>
                    ))}
                  </div>
                  <h4>Panel</h4>
                  <div className="row">
                    <button className="chip" {...chip(ui.left)} onClick={() => p.updateUi({ left: !ui.left })}>Jam &amp; segera hadir</button>
                    <button className="chip" {...chip(ui.mini)} onClick={() => p.updateUi({ mini: !ui.mini })}>Kalender mini</button>
                    <button className="chip" {...chip(ui.stickers)} onClick={() => p.updateUi({ stickers: !ui.stickers })}>Stiker</button>
                  </div>
                </div>
              );
              return (
                <div className="tlist">
                  {TOOLS.map((t) => (
                    <button key={t.tool} className="litem" aria-pressed={view.tool === t.tool} onClick={() => { p.setTool(t.tool); close(); }}>
                      <Icon n={t.icon} /> {t.label}
                    </button>
                  ))}
                  <button className="litem" onClick={() => { close(); fileRef.current?.click(); }}><Icon n="image" /> Gambar</button>
                  <button className="litem" onClick={() => setSubview('stiker')}><Icon n="smile" /> Stiker <span className="chev" /></button>
                  <button className="litem" aria-pressed={ui.notes !== 'hidden'} onClick={() => setNotes(ui.notes === 'hidden' ? 'dock' : 'hidden')}>
                    <Icon n="note" /> Catatan
                  </button>
                  <button className="litem" onClick={() => setSubview('tema')}><Icon n="palette" /> Tema <span className="chev" /></button>
                  <button className="litem" onClick={() => setSubview('font')}><Icon n="type" /> Font <span className="chev" /></button>
                  <button className="litem" onClick={() => setSubview('tampilan')}><Icon n="sliders" /> Tampilan <span className="chev" /></button>
                </div>
              );
            }}
          </Popover>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onImage(e.target.files?.[0]); e.target.value = ''; }} />

        <span className="grow" />
        <div className="seg" role="group" aria-label="Mode tampilan">
          <button aria-pressed={view.mode === 'month'} onClick={() => p.setMode('month')}>Bulan</button>
          <button aria-pressed={view.mode === 'itin'} onClick={() => p.setMode('itin')}>Itinerari</button>
        </div>
      </div>

      {(view.tool === 'pencil' || view.tool === 'eraser' || view.tool === 'text') && (
        <div className="penopts">
          <span>{view.tool === 'eraser' ? 'Ukuran penghapus' : view.tool === 'text' ? 'Warna teks' : 'Warna'}</span>
          {view.tool !== 'eraser' && (
            <span className="row">
              {PEN_COLORS.map((c) => (
                <button key={c} className="sw" style={{ background: c }} aria-label={`Warna ${c}`} aria-pressed={view.penColor === c} onClick={() => p.patchView({ penColor: c })} />
              ))}
            </span>
          )}
          {view.tool !== 'text' && (
            <>
              <label className="row">Tebal <input type="range" min={2} max={18} value={view.penSize} aria-label="Tebal pensil" onChange={(e) => p.patchView({ penSize: +e.target.value })} /></label>
              <button className="chip" onClick={undoStroke}>↶ Urungkan coretan</button>
              <button className="chip" onClick={clearStrokes}>Hapus semua coretan bulan ini</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}