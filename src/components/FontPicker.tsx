'use client';
import { useSyncExternalStore } from 'react';
import { fontStore, HAND_FONTS, UI_FONTS, type FontPref } from '@/lib/fonts';
import { Icon } from './Icon';
import { Popover } from './planner/Popover';

/** Tombol "Font": pilih font tulisan tangan dan font UI, terpisah dari pemilih tema warna. */
export function FontPicker({ onChange }: { onChange?: (p: FontPref) => void }) {
  const pref = useSyncExternalStore(fontStore.subscribe, fontStore.get, fontStore.server);
  const pick = (next: FontPref) => { fontStore.set(next); onChange?.(next); };

  return (
    <Popover align="right" trigger={(toggle) => (
      <button className="tool tool-drop" title="Ganti font" onClick={toggle}><Icon n="type" /> <span className="lbl">Font</span></button>
    )}>
      {() => (
        <div className="tp">
          <div>
            <h4>Font tulisan tangan</h4>
            <div className="fp-list">
              {HAND_FONTS.map((f, i) => (
                <button
                  key={f.label} className="chip fp-opt" aria-pressed={pref.hand === i}
                  style={{ fontFamily: f.css }}
                  onClick={() => pick({ ...pref, hand: i })}
                >{f.label}</button>
              ))}
            </div>
          </div>
          <div>
            <h4>Font UI</h4>
            <div className="fp-list">
              {UI_FONTS.map((f, i) => (
                <button
                  key={f.label} className="chip fp-opt" aria-pressed={pref.ui === i}
                  style={{ fontFamily: f.css }}
                  onClick={() => pick({ ...pref, ui: i })}
                >{f.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
}