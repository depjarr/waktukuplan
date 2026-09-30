'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { useNow } from '@/hooks/useNow';
import { isPastEvent } from '@/lib/dates';
import type { EventRow } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

/**
 * Karakter kecil yang berjalan-jalan di bagian bawah layar.
 *  - Muncul berjalan dari kiri, melambai, lalu menyapa (menyebut jadwal hari ini).
 *  - Sesekali jalan ke tempat lain, atau tidur sebentar.
 *  - Diklik => membuka jendela "Asisten Jadwal" (AI) yang sudah ada di AiDialog.
 *  - Bisa DIANGKAT (tekan & seret, mirip shimeji): wajahnya kaget, kakinya menjuntai. Dilepas => jatuh
 *    (kena gravitasi), mendarat gepeng dengan mata senyum, lalu lanjut jalan-jalan lagi.
 *  - Ikut melompat senang tiap ada jadwal baru masuk (dari AI maupun manual).
 *  - Bisa disembunyikan/dimunculkan lagi dari Tampilan -> Panel -> Karakter (disimpan di ui.mascot).
 *
 * Mau ganti gambar karakternya? Cukup ubah komponen <Sprite /> di bawah (mis. jadi <img>).
 */

type Pose = 'idle' | 'walk' | 'sleep' | 'happy' | 'held' | 'fall' | 'land';
interface Bubble { text: string; actions: boolean }

const SIZE = 96; // px, harus sama dengan --m-size di mascot.css
const SPEED = 55; // px per detik
const MARGIN = 12;
const GRAVITY = 2400; // px/s^2, dipakai untuk menghitung lama jatuh
const GREET_MS = 15000; // lama sapaan awal tampil
const DRAG_THRESHOLD = 6; // px; gerak lebih kecil dari ini dianggap klik biasa

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function buildGreeting(events: EventRow[], todayKey: string, now: Date | null): string {
  const h = (now ?? new Date()).getHours();
  const hi = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  const left = events
    .filter((e) => e.kind !== 'text' && !e.done && e.date === todayKey && !(now && isPastEvent(e, now)))
    .sort((a, b) => (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99'));
  if (!left.length) return `${hi}! Hari ini belum ada jadwal. Mau kutambahin sesuatu?`;
  const next = left[0];
  const when = next.start_time ? ` jam ${next.start_time}` : '';
  return `${hi}! Ada ${left.length} jadwal lagi hari ini. Berikutnya: ${clip(next.title, 36)}${when}.`;
}

/** Gambar karakternya (SVG). Semua warna ikut tema lewat variabel CSS di mascot.css. */
function Sprite({ pose }: { pose: Pose }) {
  const asleep = pose === 'sleep';
  const scared = pose === 'held' || pose === 'fall';
  const joy = pose === 'land';
  return (
    <svg className="m-sprite" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <ellipse className="m-shadow" cx="36" cy="69" rx="17" ry="3" />
      <g className="m-leg m-leg-l"><rect className="m-limb" x="26" y="56" width="8" height="11" rx="4" /></g>
      <g className="m-leg m-leg-r"><rect className="m-limb" x="38" y="56" width="8" height="11" rx="4" /></g>
      <g className="m-body-g">
        <path className="m-arm m-arm-l" d="M14 42 q-7 2 -8 9" />
        <path className="m-arm m-arm-r" d="M58 42 q7 2 8 9" />
        <circle className="m-body" cx="36" cy="38" r="24" />
        {/* jarum jam kecil di kepala, biar nyambung sama logo waktukuplan */}
        <path className="m-hair" d="M36 14 v-7 M36 7 l4 3" />
        <ellipse className="m-cheek" cx="24" cy="44" rx="4" ry="2.6" />
        <ellipse className="m-cheek" cx="48" cy="44" rx="4" ry="2.6" />
        {asleep ? (
          <>
            <path className="m-mouth" d="M27 37 q3 2.5 6 0 M40 37 q3 2.5 6 0" />
            <circle className="m-mouth m-mouth-o" cx="37" cy="46" r="1.6" />
          </>
        ) : scared ? (
          <>
            {/* kaget: mata melebar, alis khawatir, mulut bulat */}
            <path className="m-mouth" d="M26 31 l7 -3 M48 31 l-7 -3" />
            <ellipse className="m-eye" cx="30" cy="37" rx="3.4" ry="4.8" />
            <ellipse className="m-eye" cx="44" cy="37" rx="3.4" ry="4.8" />
            <circle className="m-mouth m-mouth-o" cx="37" cy="47" r="2.8" />
          </>
        ) : joy ? (
          <>
            {/* mendarat: mata senyum ^ ^ */}
            <path className="m-mouth" d="M26 39 q4 -5 8 0 M40 39 q4 -5 8 0 M31 45 q6 6 12 0" />
          </>
        ) : (
          <>
            <ellipse className="m-eye" cx="30" cy="37" rx="2.6" ry="3.6" />
            <ellipse className="m-eye" cx="44" cy="37" rx="2.6" ry="3.6" />
            <path className="m-mouth" d={pose === 'happy' ? 'M31 45 q6 7 12 0' : 'M32 45 q5 4 10 0'} />
          </>
        )}
      </g>
      {asleep && (
        <g className="m-zzz">
          <text x="52" y="20" className="m-z m-z1">z</text>
          <text x="58" y="12" className="m-z m-z2">Z</text>
        </g>
      )}
    </svg>
  );
}

export function Mascot() {
  const { ui, updateUi, events, todayKey, aiDlg, setAiDlg, flash, toast } = usePlanner();
  const enabled = ui.mascot !== false;
  const now = useNow(60_000);

  const [x, setX] = useState(-SIZE);
  const [y, setY] = useState(0); // tinggi diangkat dari lantai (px)
  const [liftMs, setLiftMs] = useState(0); // lama animasi jatuh; 0 saat sedang diseret
  const [dur, setDur] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [pose, setPose] = useState<Pose>('idle');
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [vw, setVw] = useState(1024);

  const rootRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(-SIZE);
  const yRef = useRef(0);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const drag = useRef<{ id: number; sx: number; sy: number; gx: number; gy: number; groundTop: number; active: boolean } | null>(null);
  const fallTimer = useRef<number | undefined>(undefined);
  const hintAt = useRef(0); // kapan petunjuk hover terakhir tampil
  const busyUntil = useRef(0); // sedang berjalan sampai kapan (ms epoch)
  const hovering = useRef(false);
  const bubbleTimer = useRef<number | undefined>(undefined);
  const poseTimer = useRef<number | undefined>(undefined);

  // Nilai terbaru untuk dibaca dari timer tanpa perlu memulai ulang efek.
  const live = useRef<{ aiDlg: boolean; bubble: boolean; greet: () => string }>({
    aiDlg,
    bubble: !!bubble,
    greet: () => '',
  });
  live.current = { aiDlg, bubble: !!bubble, greet: () => buildGreeting(events, todayKey, now) };

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const showBubble = useCallback((text: string, opts: { actions: boolean; ms: number }) => {
    window.clearTimeout(bubbleTimer.current);
    setBubble({ text, actions: opts.actions });
    bubbleTimer.current = window.setTimeout(() => setBubble(null), opts.ms);
  }, []);
  const hideBubble = useCallback(() => {
    window.clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const setPoseFor = useCallback((p: Pose, ms: number) => {
    window.clearTimeout(poseTimer.current);
    setPose(p);
    poseTimer.current = window.setTimeout(() => setPose('idle'), ms);
  }, []);

  // ----- kehidupan si karakter: masuk, menyapa, lalu keliling sesekali -----
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => { if (!dead) fn(); }, ms));
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxX = () => Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);

    const walkTo = (target: number) => {
      const from = xRef.current;
      const dist = Math.abs(target - from);
      if (dist < 6) return 0;
      const ms = Math.round((dist / SPEED) * 1000);
      busyUntil.current = Date.now() + ms + 80;
      xRef.current = target;
      window.clearTimeout(poseTimer.current);
      setDir(target > from ? 1 : -1);
      setDur(ms);
      setPose('walk');
      setX(target);
      later(() => setPose((p) => (p === 'walk' ? 'idle' : p)), ms + 60);
      return ms;
    };

    const paused = () => live.current.aiDlg || live.current.bubble || hovering.current || document.hidden || dragging.current || yRef.current > 0;

    const wander = () => {
      later(() => {
        if (!paused() && Date.now() > busyUntil.current) {
          if (Math.random() < 0.22) {
            setPoseFor('sleep', rand(8000, 13000));
          } else {
            let t = rand(MARGIN, maxX());
            if (Math.abs(t - xRef.current) < 90) t = xRef.current < maxX() / 2 ? maxX() - rand(0, 80) : MARGIN + rand(0, 80);
            walkTo(Math.min(maxX(), Math.max(MARGIN, t)));
          }
        }
        wander();
      }, rand(6500, 12000));
    };

    if (reduced) {
      // Tanpa gerak: langsung diam di pojok kanan bawah.
      later(() => { setDur(0); xRef.current = maxX(); setX(maxX()); }, 900);
    } else {
      later(() => {
        setDur(0);
        const ms = walkTo(Math.min(maxX(), Math.max(MARGIN, Math.min(window.innerWidth * 0.22, 260))));
        later(() => {
          if (!live.current.aiDlg) showBubble(live.current.greet(), { actions: true, ms: GREET_MS });
          wander();
        }, ms + 200);
      }, 900); // beri waktu pengaturan tampilan (ui.mascot) selesai dimuat
    }

    return () => { dead = true; timers.forEach(window.clearTimeout); };
  }, [enabled, setPoseFor, showBubble]);

  // Melompat senang tiap ada jadwal baru yang berkedip (dari AI atau tambah manual).
  useEffect(() => {
    if (!enabled || flash.size === 0 || dragging.current) return;
    setPoseFor('happy', 1700);
    if (!aiDlg) showBubble('Sip! Sudah masuk kalender ✨', { actions: false, ms: 3200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  useEffect(() => () => {
    window.clearTimeout(bubbleTimer.current);
    window.clearTimeout(poseTimer.current);
    window.clearTimeout(fallTimer.current);
  }, []);

  if (!enabled) return null;

  function onEnter() {
    hovering.current = true;
    if (dragging.current) return;
    // Petunjuk singkat saat kursor diarahkan (maks. sekali per 20 detik, tidak menimpa sapaan)
    if (!live.current.bubble && !live.current.aiDlg && Date.now() - hintAt.current > 20_000) {
      hintAt.current = Date.now();
      showBubble('Klik aku untuk tanya AI ✨ Angkat aku juga boleh!', { actions: false, ms: 3200 });
    }
    // Kalau lagi berjalan, berhenti di tempat supaya gampang diklik.
    if (Date.now() < busyUntil.current && rootRef.current) {
      const left = Math.round(rootRef.current.getBoundingClientRect().left);
      busyUntil.current = 0;
      xRef.current = left;
      setDur(0);
      setX(left);
    }
    setPose((p) => (p === 'walk' || p === 'sleep' ? 'idle' : p));
  }

  // ----- diangkat & dilepas -----
  function onDown(e: RPointerEvent<HTMLButtonElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const lift = liftRef.current?.getBoundingClientRect();
    const ground = rootRef.current?.getBoundingClientRect();
    if (!lift || !ground) return;
    drag.current = {
      id: e.pointerId, sx: e.clientX, sy: e.clientY,
      gx: e.clientX - lift.left, gy: e.clientY - lift.top,
      groundTop: ground.top, active: false,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* aman diabaikan */ }
  }

  function onMove(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      d.active = true;
      dragging.current = true;
      window.clearTimeout(fallTimer.current);
      window.clearTimeout(poseTimer.current);
      hideBubble();
      busyUntil.current = 0;
      setDur(0); // hentikan jalan di posisi sekarang
      setLiftMs(0); // hentikan jatuh di udara kalau sedang jatuh
      setPose('held');
    }
    const maxX = Math.max(0, window.innerWidth - SIZE);
    const nx = Math.min(maxX, Math.max(0, e.clientX - d.gx));
    const ny = Math.min(d.groundTop, Math.max(0, d.groundTop - (e.clientY - d.gy)));
    xRef.current = nx; setX(nx);
    yRef.current = ny; setY(ny);
  }

  function onUp(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* aman diabaikan */ }
    if (!d.active) return; // hanya klik biasa; onClick yang urus
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    dragging.current = false;
    const h = yRef.current;
    if (h < 2) { yRef.current = 0; setY(0); setPose('idle'); return; }
    // jatuh: durasi dari fisika sederhana, easing "makin cepat" seperti gravitasi
    const ms = Math.max(160, Math.round(Math.sqrt((2 * h) / GRAVITY) * 1000));
    busyUntil.current = Date.now() + ms + 1000;
    setLiftMs(ms);
    setPose('fall');
    yRef.current = 0;
    setY(0);
    window.clearTimeout(fallTimer.current);
    fallTimer.current = window.setTimeout(() => setPoseFor('land', 750), ms);
  }

  function openAi() {
    hideBubble();
    setAiDlg(true);
  }

  function onClick() {
    if (suppressClick.current) { suppressClick.current = false; return; }
    openAi();
  }

  function hideForever() {
    hideBubble();
    updateUi({ mascot: false });
    toast('Karakter disembunyikan. Munculkan lagi di Tampilan → Panel → Karakter');
  }

  const align = x < 110 ? 'left' : x > vw - SIZE - 110 ? 'right' : 'center';

  return (
    <div
      ref={rootRef}
      className="mascot"
      style={{ transform: `translateX(${x}px)`, transitionDuration: `${dur}ms` }}
    >
      <div
        ref={liftRef}
        className="mascot-lift"
        style={{
          transform: `translateY(${-y}px)`,
          transitionDuration: `${liftMs}ms`,
          transitionTimingFunction: 'cubic-bezier(.5,0,1,.6)',
        }}
      >
        {bubble && (
          <div
            className="m-bubble"
            role="status"
            data-align={align}
            onPointerEnter={() => { hovering.current = true; window.clearTimeout(bubbleTimer.current); }}
            onPointerLeave={() => { hovering.current = false; bubbleTimer.current = window.setTimeout(() => setBubble(null), 4000); }}
          >
            <p>{bubble.text}</p>
            {bubble.actions && (
              <div className="m-acts">
                <button className="btn primary small" onClick={openAi}>Tanya AI ➤</button>
                <button className="btn small" onClick={hideBubble}>Nanti</button>
                <button className="m-hide" onClick={hideForever}>Sembunyikan aku</button>
              </div>
            )}
          </div>
        )}
        <button
          className="mascot-btn"
          aria-label="Buka asisten jadwal (AI)"
          title="Klik aku untuk minta bantuan AI. Angkat aku juga boleh!"
          data-pose={pose}
          style={{ '--dir': dir } as CSSProperties}
          onPointerEnter={onEnter}
          onPointerLeave={() => { hovering.current = false; }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onClick}
        >
          <Sprite pose={pose} />
        </button>
      </div>
    </div>
  );
}