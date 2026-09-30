'use client';
import { useRef } from 'react';
import { DOWS, ymd } from '@/lib/dates';
import { DayCell } from './DayCell';
import { DrawLayer } from './DrawLayer';
import { usePlanner } from './PlannerProvider';
import { StickerLayer } from './StickerLayer';

/** Kalender bulanan (gaya planner) + lapisan coretan dan stiker di atasnya. */
export function MonthGrid() {
  const { view, byDate, addSticker, patchView, setTool } = usePlanner();
  const stageRef = useRef<HTMLDivElement>(null);
  const { year: y, month: m } = view;

  const startDow = (new Date(y, m, 1).getDay() + 6) % 7; // Senin = 0
  const dim = new Date(y, m + 1, 0).getDate();
  const prevDim = new Date(y, m, 0).getDate();
  const rows = Math.ceil((startDow + dim) / 7);

  const cells = Array.from({ length: rows * 7 }, (_, i) => {
    const dn = i - startDow + 1;
    let date: Date, out = false;
    if (dn < 1) { date = new Date(y, m - 1, prevDim + dn); out = true; }
    else if (dn > dim) { date = new Date(y, m + 1, dn - dim); out = true; }
    else date = new Date(y, m, dn);
    const key = ymd(date);
    return <DayCell key={key} date={key} dayNum={date.getDate()} out={out} col={i % 7} list={byDate[key] ?? []} />;
  });

  // Alat "Teks": klik di kalender menaruh teks ngambang di titik itu
  function onStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (view.tool === 'text' && !target.closest('.sticker') && !target.closest('button')) {
      const r = stageRef.current!.getBoundingClientRect();
      addSticker({
        type: 'text', text_content: 'tulis di sini', fs: 26, color: view.penColor,
        x: Math.max(0, Math.min(92, ((e.clientX - r.left) / r.width) * 100)),
        y: Math.max(0, Math.min(96, ((e.clientY - r.top) / r.height) * 100)),
      });
      setTool('select');
      e.preventDefault();
      return;
    }
    if (!target.closest('.sticker')) patchView({ selSticker: null });
  }

  return (
    <div className="stage" ref={stageRef} data-tool={view.tool} onPointerDown={onStagePointerDown}>
      <div className="grid">
        {DOWS.map((d) => <div key={d} className="dow">{d}</div>)}
        {cells}
      </div>
      <DrawLayer stageRef={stageRef} />
      <StickerLayer stageRef={stageRef} />
    </div>
  );
}
