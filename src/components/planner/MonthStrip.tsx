'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { coverSVG } from '@/lib/coverArt';
import { MONTHS } from '@/lib/dates';
import { deleteImage, resizeImage, uploadImage } from '@/lib/image';
import { usePlanner } from './PlannerProvider';

/** 12 kartu bulan. Gambar tiap bulan bisa diganti lewat ikon kamera. */
export function MonthStrip() {
  const { view, gotoMonth, covers, sb, userId, toast } = usePlanner();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = stripRef.current;
    const on = st?.querySelector<HTMLElement>('.mcard.on');
    if (st && on) st.scrollTo({ left: on.offsetLeft - st.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth' });
  }, [view.month]);

  async function onCover(i: number, file: File | undefined) {
    if (!file) return;
    const oldUrl = covers.covers[i];
    try {
      const url = await uploadImage(sb, userId, await resizeImage(file, 520, false));
      await covers.setCover(i, url);
      toast(`Gambar ${MONTHS[i]} diganti`);
      deleteImage(sb, oldUrl).catch(() => {}); // gagal hapus gak masalah, gak ganggu UX
    } catch {
      toast('Gambar gagal diunggah');
    }
  }

  return (
    <div className="months" ref={stripRef} aria-label="Pilih bulan">
      {MONTHS.map((name, i) => (
        <div
          key={name} className={`mcard${i === view.month ? ' on' : ''}`} role="button" tabIndex={0} aria-label={name}
          style={{ ['--cover' as string]: `url("${covers.covers[i] ?? coverSVG(i)}")` }}
          onClick={() => gotoMonth(view.year, i)}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); gotoMonth(view.year, i); } }}
        >
          <div className="mimg" />
          <div className="mlab">{name}</div>
          <label className="mup" title={`Ganti gambar ${name}`} onClick={(e) => e.stopPropagation()}>
            <input type="file" accept="image/*" hidden onChange={(e) => { onCover(i, e.target.files?.[0]); e.target.value = ''; }} /><Icon n="image" size={14} />
          </label>
        </div>
      ))}
    </div>
  );
}