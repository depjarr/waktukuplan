'use client';
import { useSyncExternalStore } from 'react';
import { MODE_LABELS, PALETTES, themeStore, type ThemePref } from '@/lib/theme';
import { Icon } from './Icon';
import { Popover } from './planner/Popover';

/** Tombol "Tema": pilih palet warna dan mode terang/gelap. onChange dipakai untuk ikut menyimpan ke akun. */
export function ThemePicker({ onChange }: { onChange?: (p: ThemePref) => void }) {
  const pref = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.server);
  const pick = (next: ThemePref) => { themeStore.set(next); onChange?.(next); };

  return (
    <Popover align="right" trigger={(toggle) => (
      <button className="tool tool-drop" title="Ganti tema warna" onClick={toggle}><Icon n="palette" /> <span className="lbl">Tema</span></button>
    )}>
      {() => (
        <div className="tp">
          <div>
            <h4>Mode</h4>
            <div className="row">
              {MODE_LABELS.map(([m, label]) => (
                <button key={m} className="chip" aria-pressed={pref.m === m} onClick={() => pick({ ...pref, m })}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <h4>Palet warna</h4>
            <div className="tp-grid">
              {PALETTES.map((colors, i) => (
                <button key={i} className="tp-sw" aria-pressed={pref.p === i}
                  title={i === 0 ? 'Bawaan' : `Palet ${i}`} aria-label={i === 0 ? 'Palet bawaan' : `Palet ${i}`}
                  onClick={() => pick({ ...pref, p: i })}>
                  {colors.map((c, j) => <span key={j} style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
}