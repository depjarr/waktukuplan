'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { Stroke } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

function segment(ctx: CanvasRenderingContext2D, W: number, H: number, a: [number, number], b: [number, number], s: Stroke) {
  ctx.save();
  ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.c;
  ctx.lineWidth = s.w * W;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0] * W, a[1] * H);
  ctx.lineTo(b[0] * W + 0.01, b[1] * H);
  ctx.stroke();
  ctx.restore();
}
function drawStroke(ctx: CanvasRenderingContext2D, W: number, H: number, s: Stroke) {
  if (s.p.length === 1) return segment(ctx, W, H, s.p[0], s.p[0], s);
  for (let i = 1; i < s.p.length; i++) segment(ctx, W, H, s.p[i - 1], s.p[i], s);
}

/** Kanvas corat-coret di atas kalender. Koordinat disimpan 0..1 supaya tetap pas saat ukuran layar berubah. */
export function DrawLayer({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { view, drawing } = usePlanner();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke | null>(null);
  const strokesRef = useRef(drawing.strokes);
  strokesRef.current = drawing.strokes;

  const redraw = useCallback(() => {
    const cv = cvRef.current, stage = stageRef.current;
    if (!cv || !stage) return;
    const r = stage.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
    cv.style.width = `${r.width}px`;
    cv.style.height = `${r.height}px`;
    const ctx = cv.getContext('2d')!;
    strokesRef.current.forEach((s) => drawStroke(ctx, cv.width, cv.height, s));
  }, [stageRef]);

  // gambar ulang saat coretan berubah atau ukuran kalender berubah
  useEffect(() => { redraw(); }, [drawing.strokes, redraw]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [stageRef, redraw]);

  const pt = (e: React.PointerEvent): [number, number] => {
    const r = stageRef.current!.getBoundingClientRect();
    return [+((e.clientX - r.left) / r.width).toFixed(4), +((e.clientY - r.top) / r.height).toFixed(4)];
  };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (view.tool !== 'pencil' && view.tool !== 'eraser') return;
    const r = stageRef.current!.getBoundingClientRect();
    const eraser = view.tool === 'eraser';
    cur.current = { c: view.penColor, w: (view.penSize * (eraser ? 3 : 1)) / r.width, e: eraser, p: [pt(e)] };
    e.currentTarget.setPointerCapture(e.pointerId);
    const cv = cvRef.current!;
    drawStroke(cv.getContext('2d')!, cv.width, cv.height, cur.current);
    e.preventDefault();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = cur.current, cv = cvRef.current;
    if (!s || !cv) return;
    const p = pt(e), last = s.p[s.p.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.0015) return;
    s.p.push(p);
    segment(cv.getContext('2d')!, cv.width, cv.height, last, p, s);
  }
  function up() {
    const s = cur.current;
    cur.current = null;
    if (s) drawing.save([...strokesRef.current, s]);
  }

  return <canvas ref={cvRef} className="draw-layer" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />;
}
