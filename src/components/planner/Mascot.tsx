'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { useNow } from '@/hooks/useNow';
import { isPastEvent } from '@/lib/dates';
import type { EventRow } from '@/lib/types';
import { usePlanner } from './PlannerProvider';

/**
 * Karakter kecil bernama Tika yang berjalan-jalan di bagian bawah layar.
 *  - Muncul berjalan dari kiri, melambai, lalu menyapa (menyebut jadwal hari ini).
 *  - Sesekali jalan ke tempat lain, atau tidur sebentar.
 *  - Diklik => membuka jendela "Asisten Jadwal" (AI) yang sudah ada di AiDialog.
 *  - Bisa DIANGKAT (tekan & seret, mirip shimeji): wajahnya kaget, kakinya menjuntai. Dilepas => jatuh
 *    (kena gravitasi), mendarat gepeng dengan mata senyum, lalu lanjut jalan-jalan lagi.
 *  - Model & warna rambut bisa diganti lewat tombol "Ganti gaya" di balon sapaan.
 *  - Ikut melompat senang tiap ada jadwal baru masuk (dari AI maupun manual).
 *  - Bisa disembunyikan/dimunculkan lagi dari Tampilan -> Panel -> Karakter (disimpan di ui.mascot).
 *
 * Mau ganti gambar karakternya? Cukup ubah komponen <Sprite /> di bawah (mis. jadi <img>).
 */

type Pose = 'idle' | 'walk' | 'sleep' | 'happy' | 'held' | 'fall' | 'land';
interface Bubble { text: string; actions: boolean; picker?: boolean }

type HairStyle = 'lurus' | 'kepang' | 'kuncir' | 'twintail' | 'pendek' | 'cepol';
const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'lurus', label: 'Lurus panjang' },
  { id: 'kepang', label: 'Kepang dua' },
  { id: 'kuncir', label: 'Kuncir' },
  { id: 'twintail', label: 'Twintail' },
  { id: 'pendek', label: 'Bob' },
  { id: 'cepol', label: 'Cepol' },
];
const HAIR_COLORS: { hex: string; label: string }[] = [
  { hex: '#3a2622', label: 'Hitam' },
  { hex: '#7a4a2b', label: 'Cokelat' },
  { hex: '#d9a441', label: 'Pirang' },
  { hex: '#b5442f', label: 'Merah' },
  { hex: '#e58fb0', label: 'Pink' },
  { hex: '#4a6fa5', label: 'Biru' },
  { hex: '#7b5aa6', label: 'Ungu' },
  { hex: '#c9ccd6', label: 'Perak' },
];
const LOOK_KEY = 'waktukuplan-mascot-look';

const NAME = 'Tika'; // nama karakter, muncul di sapaan, tombol, dan label
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
  if (!left.length) return `${hi}! Aku ${NAME}. Hari ini belum ada jadwal, mau kutambahin sesuatu?`;
  const next = left[0];
  const when = next.start_time ? ` jam ${next.start_time}` : '';
  return `${hi}, aku ${NAME}! Ada ${left.length} jadwal lagi hari ini. Berikutnya: ${clip(next.title, 36)}${when}.`;
}

/** Rambut bagian belakang (di belakang kepala & baju). Beda tiap model. */
function HairBack({ hair }: { hair: HairStyle }) {
  const cap = 'M17 26 C15 34 17 38 21 41.5 Q36 45 51 41.5 C55 38 57 34 55 26 Z';
  switch (hair) {
    case 'kepang':
      return (
        <>
          <path className="m-hair-b" d={cap} />
          <g className="m-hair-b">
            <ellipse cx="19" cy="44" rx="3.4" ry="2.8" /><ellipse cx="18" cy="49" rx="3.4" ry="2.8" />
            <ellipse cx="19" cy="54" rx="3.4" ry="2.8" /><ellipse cx="18" cy="59" rx="3.2" ry="2.6" />
            <ellipse cx="53" cy="44" rx="3.4" ry="2.8" /><ellipse cx="54" cy="49" rx="3.4" ry="2.8" />
            <ellipse cx="53" cy="54" rx="3.4" ry="2.8" /><ellipse cx="54" cy="59" rx="3.2" ry="2.6" />
          </g>
          <circle className="m-tie" cx="18" cy="62.4" r="1.7" />
          <circle className="m-tie" cx="54" cy="62.4" r="1.7" />
        </>
      );
    case 'kuncir':
      return (
        <>
          <path className="m-hair-b" d={cap} />
          <path className="m-hair-b" d="M50 15 C66 13 68 38 62 57 C58 52 57 40 52 28 Z" />
        </>
      );
    case 'twintail':
      return (
        <>
          <path className="m-hair-b" d={cap} />
          <path className="m-hair-b" d="M21 19 C8 18 4.5 40 9 58 C14 53 16 40 20 29 Z" />
          <path className="m-hair-b" d="M51 19 C64 18 67.5 40 63 58 C58 53 56 40 52 29 Z" />
        </>
      );
    case 'pendek':
      return <path className="m-hair-b" d="M15.5 27 C12.5 37 13.5 45 16.5 49.5 Q36 54 55.5 49.5 C58.5 45 59.5 37 56.5 27 Z" />;
    case 'cepol':
      return (
        <>
          <path className="m-hair-b" d={cap} />
          <circle className="m-hair-b" cx="36" cy="8.5" r="6.6" />
        </>
      );
    default:
      return <path className="m-hair-b" d="M16 26 C12.5 38 13.5 51 16.5 58.5 Q25 61.5 36 60.5 Q47 61.5 55.5 58.5 C58.5 51 59.5 38 56 26 Z" />;
  }
}

/** Helai rambut di samping wajah (di depan kepala). */
function HairSide({ hair }: { hair: HairStyle }) {
  const long = hair === 'lurus';
  const mid = hair === 'pendek';
  const l = long ? 'M16.8 27 C15 37 16.5 46 19.5 52.5 C21.6 45 21.4 36 23 28.5 Z'
    : mid ? 'M16.8 27 C15 35 16 42 18.5 46.5 C21 41 21.4 35 23 28.5 Z'
    : 'M16.8 27 C15.5 33 16.5 38 19 41 C20.8 36 21.4 32 23 28.5 Z';
  const r = long ? 'M55.2 27 C57 37 55.5 46 52.5 52.5 C50.4 45 50.6 36 49 28.5 Z'
    : mid ? 'M55.2 27 C57 35 56 42 53.5 46.5 C51 41 50.6 35 49 28.5 Z'
    : 'M55.2 27 C56.5 33 55.5 38 53 41 C51.2 36 50.6 32 49 28.5 Z';
  return (
    <>
      <path className="m-hair-f" d={l} />
      <path className="m-hair-f" d={r} />
    </>
  );
}

/** Gambar karakternya (SVG): anak perempuan chibi berambut panjang. Warna baju/aksesori ikut tema lewat variabel CSS di mascot.css. */
function Sprite({ pose, hair }: { pose: Pose; hair: HairStyle }) {
  const asleep = pose === 'sleep';
  const scared = pose === 'held' || pose === 'fall';
  const joy = pose === 'land';
  return (
    <svg className="m-sprite" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <ellipse className="m-shadow" cx="36" cy="69" rx="17" ry="3" />
      <g className="m-body-g">
        {/* rambut belakang */}
        <HairBack hair={hair} />
        {/* baju */}
        <path className="m-dress" d="M29 44 h14 l6 13 q-13 3 -26 0 z" />
        <path className="m-lace" d="M23.6 57 q12.4 3 24.8 0" />
        <circle className="m-dot" cx="31" cy="50" r="0.9" />
        <circle className="m-dot" cx="38" cy="53" r="0.9" />
        <circle className="m-dot" cx="42" cy="48.5" r="0.9" />
        <circle className="m-dot" cx="28" cy="55" r="0.9" />
        <circle className="m-dot" cx="45.5" cy="54.5" r="0.9" />
        <circle className="m-dot" cx="35" cy="47" r="0.9" />
        {/* lengan */}
        <g className="m-arm m-arm-l">
          <path className="m-arm-skin" d="M28.5 47 q-5 2 -5 8" />
          <circle className="m-sleeve" cx="28.5" cy="46.5" r="2.7" />
        </g>
        <g className="m-arm m-arm-r">
          <path className="m-arm-skin" d="M43.5 47 q5 2 5 8" />
          <circle className="m-sleeve" cx="43.5" cy="46.5" r="2.7" />
        </g>
        {/* kepala */}
        <ellipse className="m-face" cx="36" cy="27" rx="18.5" ry="16.5" />
        <ellipse className="m-cheek" cx="24" cy="35" rx="3.8" ry="2.4" />
        <ellipse className="m-cheek" cx="48" cy="35" rx="3.8" ry="2.4" />
        {asleep ? (
          <>
            <path className="m-mouth" d="M25 31 q4 3 8 0 M39 31 q4 3 8 0" />
            <circle className="m-mouth m-mouth-o" cx="36" cy="39.5" r="1.3" />
          </>
        ) : scared ? (
          <>
            {/* kaget: mata melebar, mulut bulat, keringat */}
            <g className="m-eye"><ellipse cx="29" cy="30.5" rx="4.7" ry="5.9" /><circle className="m-glint" cx="30.6" cy="28" r="1.6" /></g>
            <g className="m-eye"><ellipse cx="43" cy="30.5" rx="4.7" ry="5.9" /><circle className="m-glint" cx="44.6" cy="28" r="1.6" /></g>
            <circle className="m-mouth m-mouth-o" cx="36" cy="40" r="2.3" />
            <path className="m-sweat" d="M53 27 q2.6 3.4 0 5.6 q-2.6 -2.2 0 -5.6" />
          </>
        ) : joy ? (
          <>
            {/* mendarat: mata senyum ^ ^ */}
            <path className="m-mouth" d="M25 31.5 q4 -5 8 0 M39 31.5 q4 -5 8 0 M32.5 37.5 q3.5 5 7 0" />
          </>
        ) : (
          <>
            <g className="m-eye"><ellipse cx="29" cy="30.5" rx="4.1" ry="5" /><circle className="m-glint" cx="30.4" cy="28.4" r="1.4" /><circle className="m-glint" cx="27.6" cy="32.6" r="0.7" /></g>
            <g className="m-eye"><ellipse cx="43" cy="30.5" rx="4.1" ry="5" /><circle className="m-glint" cx="44.4" cy="28.4" r="1.4" /><circle className="m-glint" cx="41.6" cy="32.6" r="0.7" /></g>
            <path className="m-lash" d="M24.4 27.6 l-2 -1.2 M48.6 27.6 l2 -1.2" />
            <path className="m-mouth" d={pose === 'happy' ? 'M32 37.6 q4 5 8 0' : 'M33.5 38.2 q2.5 2.4 5 0'} />
          </>
        )}
        {/* poni belah tengah + rambut samping */}
        <path className="m-hair-f" d="M16.5 28 C14.5 8 57.5 8 55.5 28 C51.5 22 45 18 36 13.5 C28 18 21.5 23 16.5 28 Z" />
        <HairSide hair={hair} />
        {/* aksesori: jepit jam (nyambung sama logo) & pita */}
        <g className="m-clip">
          <circle cx="22.5" cy="19.5" r="3.4" />
          <path d="M22.5 19.5 v-2 M22.5 19.5 l1.6 1" />
        </g>
        <g className="m-bow" transform="rotate(12 50 16)">
          <path d="M50 16 l-6 -3.6 v7.2 z M50 16 l6 -3.6 v7.2 z" />
          <circle cx="50" cy="16" r="1.7" />
        </g>
      </g>
      {/* kaki: kulit, kaus kaki, sepatu */}
      <g className="m-leg m-leg-l">
        <rect className="m-skin" x="30" y="57" width="5" height="5" rx="2" />
        <rect className="m-sock" x="29.6" y="60" width="5.8" height="4" rx="2" />
        <rect className="m-shoe" x="28.6" y="63.6" width="7.4" height="3.6" rx="1.8" />
      </g>
      <g className="m-leg m-leg-r">
        <rect className="m-skin" x="37" y="57" width="5" height="5" rx="2" />
        <rect className="m-sock" x="36.6" y="60" width="5.8" height="4" rx="2" />
        <rect className="m-shoe" x="36" y="63.6" width="7.4" height="3.6" rx="1.8" />
      </g>
      {asleep && (
        <g className="m-zzz">
          <text x="54" y="20" className="m-z m-z1">z</text>
          <text x="60" y="12" className="m-z m-z2">Z</text>
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
  const [look, setLook] = useState<{ style: HairStyle; color: string }>({ style: 'lurus', color: HAIR_COLORS[0].hex });

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
  const live = useRef({ aiDlg, bubble: !!bubble, greet: (): string => '' });
  live.current = { aiDlg, bubble: !!bubble, greet: () => buildGreeting(events, todayKey, now) };

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Muat & simpan gaya rambut pilihan (disimpan di browser).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOOK_KEY);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (HAIR_STYLES.some((h) => h.id === v?.style) && /^#[0-9a-f]{6}$/i.test(v?.color ?? '')) setLook({ style: v.style, color: v.color });
    } catch { /* abaikan */ }
  }, []);
  const changeLook = (patch: Partial<{ style: HairStyle; color: string }>) => {
    setLook((cur) => {
      const next = { ...cur, ...patch };
      try { window.localStorage.setItem(LOOK_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
      return next;
    });
    setPoseFor('happy', 1200);
  };

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
    if (!aiDlg) showBubble('Sip! Sudah kucatat di kalender ✨', { actions: false, ms: 3200 });
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
      showBubble(`Hai, aku ${NAME}! Klik aku untuk tanya AI ✨ Angkat aku juga boleh!`, { actions: false, ms: 3200 });
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

  function openPicker() {
    window.clearTimeout(bubbleTimer.current);
    setBubble({ text: '', actions: false, picker: true });
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
    toast(`${NAME} disembunyikan. Munculkan lagi di Tampilan → Panel → Karakter`);
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
            onPointerLeave={() => { hovering.current = false; if (!bubble.picker) bubbleTimer.current = window.setTimeout(() => setBubble(null), 4000); }}
          >
            {bubble.picker ? (
              <div className="m-picker">
                <p className="m-ptitle">Model rambut</p>
                <div className="m-chips">
                  {HAIR_STYLES.map((h) => (
                    <button key={h.id} className="m-chip" aria-pressed={look.style === h.id} onClick={() => changeLook({ style: h.id })}>{h.label}</button>
                  ))}
                </div>
                <p className="m-ptitle">Warna rambut</p>
                <div className="m-swatches">
                  {HAIR_COLORS.map((c) => (
                    <button key={c.hex} className="m-swatch" style={{ background: c.hex }} title={c.label} aria-label={c.label} aria-pressed={look.color === c.hex} onClick={() => changeLook({ color: c.hex })} />
                  ))}
                </div>
                <div className="m-acts"><button className="btn primary small" onClick={hideBubble}>Selesai</button></div>
              </div>
            ) : (
              <p>{bubble.text}</p>
            )}
            {bubble.actions && (
              <div className="m-acts">
                <button className="btn primary small" onClick={openAi}>Tanya {NAME} ➤</button>
                <button className="btn small" onClick={openPicker}>Ganti gaya 🎀</button>
                <button className="btn small" onClick={hideBubble}>Nanti</button>
                <button className="m-hide" onClick={hideForever}>Sembunyikan {NAME}</button>
              </div>
            )}
          </div>
        )}
        <button
          className="mascot-btn"
          aria-label={`Buka asisten jadwal (${NAME}, AI)`}
          title={`Klik ${NAME} untuk minta bantuan AI. Angkat juga boleh!`}
          data-pose={pose}
          style={{ '--dir': dir, '--m-hair': look.color } as CSSProperties}
          onPointerEnter={onEnter}
          onPointerLeave={() => { hovering.current = false; }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onClick}
        >
          <Sprite pose={pose} hair={look.style} />
        </button>
      </div>
    </div>
  );
}