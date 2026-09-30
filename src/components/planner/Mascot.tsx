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
 *  - Model & warna rambut: klik kanan (atau tahan) pada karakter, atau tombol "Ganti gaya" di balonnya.
 *  - Ikut melompat senang tiap ada jadwal baru masuk (dari AI maupun manual).
 *  - Bisa disembunyikan/dimunculkan lagi dari Tampilan -> Panel -> Karakter (disimpan di ui.mascot).
 *
 * Mau ganti gambar karakternya? Cukup ubah komponen <Sprite /> di bawah (mis. jadi <img>).
 */

type Pose = 'idle' | 'walk' | 'sleep' | 'happy' | 'held' | 'fall' | 'land';
interface Bubble { text: string; actions: boolean; picker?: boolean }

type HairStyle = 'gelombang' | 'lurus' | 'kepang' | 'kuncir' | 'twintail' | 'pendek' | 'cepol';
const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'gelombang', label: 'Bergelombang' },
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

/** Kerangka kepala belakang (dipakai beberapa model rambut). */
const HAIR_CAP = 'M22 40 C19 15 33 7 48 7 C63 7 77 15 74 40 C75 46 73 50 70 52 L26 52 C23 50 21 46 22 40 Z';
const FLIP = 'translate(96 0) scale(-1 1)';

/** Rambut BELAKANG (di belakang kepala & baju). Beda tiap model. */
function HairBack({ hair }: { hair: HairStyle }) {
  switch (hair) {
    case 'lurus':
      return <path className="m-hair-d" d="M22 36 C19 15 33 7 48 7 C63 7 77 15 74 36 C78 50 79 64 77 80 Q72 83 66 82 L30 82 Q24 83 19 80 C17 64 18 50 22 36 Z" />;
    case 'kepang':
      return (
        <>
          <path className="m-hair-d" d={HAIR_CAP} />
          {[50, 56, 62, 68, 74, 80].map((cy, i) => (
            <g key={cy}>
              <ellipse className="m-hair-d" cx={i % 2 ? 21.5 : 22.5} cy={cy} rx="4.3" ry="3.9" />
              <ellipse className="m-hair-d" cx={i % 2 ? 74.5 : 73.5} cy={cy} rx="4.3" ry="3.9" />
            </g>
          ))}
        </>
      );
    case 'kuncir':
      return (
        <>
          <path className="m-hair-d" d="M72 24 C87 22 91 40 86 56 C84 64 86 70 82 77 C77 70 77 62 77 54 C77 44 75 36 69 32 Z" />
          <path className="m-hair-d" d={HAIR_CAP} />
        </>
      );
    case 'twintail':
      return (
        <>
          <path className="m-hair-d" d="M27 18 C14 14 6 34 10 52 C11 62 9 70 12 77 C18 70 20 62 21 54 C22 45 26 38 31 30 Z" />
          <path className="m-hair-d" d="M27 18 C14 14 6 34 10 52 C11 62 9 70 12 77 C18 70 20 62 21 54 C22 45 26 38 31 30 Z" transform={FLIP} />
          <path className="m-hair-d" d={HAIR_CAP} />
        </>
      );
    case 'pendek':
      return <path className="m-hair-d" d="M22 36 C19 15 33 7 48 7 C63 7 77 15 74 36 C77 46 77 54 73 60 Q48 67 23 60 C19 54 19 46 22 36 Z" />;
    case 'cepol':
      return (
        <>
          <circle className="m-hair-d" cx="48" cy="6.5" r="7.5" />
          <path className="m-hair-d" d={HAIR_CAP} />
        </>
      );
    default: // gelombang
      return (
        <path
          className="m-hair-d"
          d="M22 36 C19 15 33 7 48 7 C63 7 77 15 74 36 C80 46 82 57 78 64 C83 69 82 76 77 79
             C73 76 70 72 69 66 L66 44 L30 44 L27 66 C26 72 23 76 19 79 C14 76 13 69 18 64 C14 57 16 46 22 36 Z"
        />
      );
  }
}

/** Ikat rambut (digambar di depan, supaya tidak tertutup poni). */
function HairTies({ hair }: { hair: HairStyle }) {
  if (hair === 'kepang') {
    return (
      <>
        <circle className="m-tie m-ol" cx="22" cy="84.5" r="2.3" />
        <circle className="m-tie m-ol" cx="74" cy="84.5" r="2.3" />
      </>
    );
  }
  if (hair === 'twintail') {
    return (
      <>
        <ellipse className="m-tie m-ol" cx="27" cy="20.5" rx="2.6" ry="2.3" />
        <ellipse className="m-tie m-ol" cx="69" cy="20.5" rx="2.6" ry="2.3" />
      </>
    );
  }
  if (hair === 'kuncir') return <ellipse className="m-tie m-ol" cx="72.5" cy="28" rx="2.5" ry="2.7" />;
  return null;
}

/**
 * Gambar karakternya (SVG), gaya ilustrasi doodle: garis tepi tipis, kepala bulat besar,
 * mata titik, pipi merah muda, poni tipis, kaos dengan rok overall pink, dan jepit rambut.
 * Warna rambut ikut pilihan (variabel CSS --m-hair); garis tepi lewat --m-line (lihat mascot.css).
 */
function Sprite({ pose, hair }: { pose: Pose; hair: HairStyle }) {
  const asleep = pose === 'sleep';
  const scared = pose === 'held' || pose === 'fall';
  const joy = pose === 'land';

  // Helai samping wajah: panjangnya beda tiap model.
  const L = hair === 'pendek' ? 54 : hair === 'cepol' || hair === 'kuncir' ? 56 : 63;
  const lock = `M22 33 C19 ${L - 18} 20 ${L - 8} 23.5 ${L} C27 ${L - 7} 28 ${L - 16} 27.5 ${L - 24} C27 ${L - 30} 26 31 24.5 30 Z`;

  // Poni tipis dengan belahan sedikit ke kanan (dahi kelihatan sedikit).
  const bangs =
    'M21 40 C18 15 33 7 48 7 C63 7 78 15 75 40 C72 34 70 28 67 24 C64 26 61 26 58 22 C56 24 54 22 52 17 ' +
    'C50 24 47 28 44 28 C42 27 40 27 37 29 C35 27 32 28 29 30 C27 29 25 31 24 34 C23 36 22 38 21 40 Z';

  return (
    <svg className="m-sprite" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <ellipse className="m-shadow" cx="48" cy="93" rx="18" ry="2.4" />

      <g className="m-body-g">
        <HairBack hair={hair} />

        {/* kaki: kaus kaki putih + sepatu pink */}
        <g className="m-leg m-leg-l">
          <rect className="m-ol" x="39.5" y="80" width="6" height="9.5" rx="2.4" fill="#fff7f2" />
          <path className="m-ol" fill="#ee94aa" d="M38.6 89 Q42.5 87.6 46.4 89 L47 93 Q42.5 95 38 93 Z" />
        </g>
        <g className="m-leg m-leg-r">
          <rect className="m-ol" x="50.5" y="80" width="6" height="9.5" rx="2.4" fill="#fff7f2" />
          <path className="m-ol" fill="#ee94aa" d="M49.6 89 Q53.5 87.6 57.4 89 L58 93 Q53.5 95 49 93 Z" />
        </g>

        {/* kaos krem */}
        <path className="m-ol" fill="#fffaf1" d="M37 57 C33 60 32 68 33 76 L63 76 C64 68 63 60 59 57 Q48 62 37 57 Z" />

        {/* rok overall pink */}
        <path className="m-ol" fill="#f9b9c8" d="M36 66 Q48 69.5 60 66 C62 71 65 76 67.5 81.5 Q64 84 60 82 Q56 84.5 52 82.5 Q48 85 44 82.5 Q40 84.5 36 82 Q32 84 28.5 81.5 C31 76 34 71 36 66 Z" />
        <path className="m-quilt" d="M42 71 L39.5 81" />
        <path className="m-quilt" d="M48 71.5 L48 83" />
        <path className="m-quilt" d="M54 71 L56.5 81" />
        <path className="m-ol" fill="#f9b9c8" d="M39.5 63 L56.5 63 L58 68 Q48 70.5 38 68 Z" />
        <path className="m-ol" fill="#f9b9c8" d="M38.5 56 L42.5 56.5 L43.5 64 L39.5 64 Z" />
        <path className="m-ol" fill="#f9b9c8" d="M53.5 56.5 L57.5 56 L56.5 64 L52.5 64 Z" />
        <circle cx="41.5" cy="62" r="1.1" fill="#f7c948" />
        <circle cx="54.5" cy="62" r="1.1" fill="#f7c948" />

        {/* lengan: lengan kaos pendek */}
        <g className="m-arm m-arm-l">
          <circle className="m-ol" cx="31.5" cy="79.5" r="2.5" fill="#ffe7d8" />
          <path className="m-ol" fill="#ffe7d8" d="M33 62 C30 66 29 72 29.5 77 L34 77.5 C34.5 72 36 67 37 63 Z" />
          <path className="m-ol" fill="#fffaf1" d="M37.5 59 C32 58 29.5 62 30 66.5 L37 67.5 L38.5 62 Z" />
        </g>
        <g className="m-arm m-arm-r">
          <circle className="m-ol" cx="64.5" cy="79.5" r="2.5" fill="#ffe7d8" />
          <path className="m-ol" fill="#ffe7d8" d="M63 62 C66 66 67 72 66.5 77 L62 77.5 C61.5 72 60 67 59 63 Z" />
          <path className="m-ol" fill="#fffaf1" d="M58.5 59 C64 58 66.5 62 66 66.5 L59 67.5 L57.5 62 Z" />
        </g>

        {/* wajah bulat besar */}
        <ellipse className="m-ol" cx="48" cy="37" rx="25" ry="21" fill="#fff0e4" />

        {/* pipi */}
        <ellipse cx="30.5" cy="46.5" rx="5.2" ry="3.3" fill="#f5989f" opacity="0.6" />
        <ellipse cx="65.5" cy="46.5" rx="5.2" ry="3.3" fill="#f5989f" opacity="0.6" />

        {asleep ? (
          <>
            <path className="m-ln" d="M34 41 Q38 44.5 42 41" />
            <path className="m-ln" d="M54 41 Q58 44.5 62 41" />
            <circle cx="48" cy="47" r="1.1" fill="#d98b80" />
          </>
        ) : scared ? (
          <>
            <ellipse cx="38" cy="41" rx="3" ry="3.6" fill="#2b211f" />
            <ellipse cx="58" cy="41" rx="3" ry="3.6" fill="#2b211f" />
            <circle cx="39" cy="39.6" r="1" fill="#fff" />
            <circle cx="59" cy="39.6" r="1" fill="#fff" />
            <ellipse cx="48" cy="49" rx="1.7" ry="2.1" fill="#c9756f" />
            <path d="M70 31 q3 3.6 0 5.8 q-3 -2.2 0 -5.8 z" fill="#9fd0ee" />
          </>
        ) : joy ? (
          <>
            <path className="m-ln" d="M34.5 42.5 Q38 37.5 41.5 42.5" />
            <path className="m-ln" d="M54.5 42.5 Q58 37.5 61.5 42.5" />
            <path className="m-ol" fill="#f27f86" d="M43.5 46 Q48 53 52.5 46 Z" />
          </>
        ) : (
          <>
            <circle cx="38" cy="41" r="2.5" fill="#2b211f" />
            <circle cx="58" cy="41" r="2.5" fill="#2b211f" />
            <circle cx="38.8" cy="40.1" r="0.75" fill="#fff" />
            <circle cx="58.8" cy="40.1" r="0.75" fill="#fff" />
            <path className="m-ln" d="M35.3 39.3 l-1.8 -1.2 M60.7 39.3 l1.8 -1.2" />
            <circle cx="48" cy="44.2" r="0.7" fill="#d98b80" />
            <path className="m-ln" d="M45 46.6 Q48 49.6 51 46.6" />
          </>
        )}

        {/* poni tipis + helai samping (digambar setelah wajah) */}
        <path className="m-hair" d={bangs} />
        <path className="m-strand" d="M38 11 C34 15 32 20 31 26" />
        <path className="m-strand" d="M58 10 C61 14 62 18 62 22" />
        <path className="m-hair" d={lock} />
        <path className="m-hair" d={lock} transform={FLIP} />
        <path className="m-strand" d="M24 40 C23 48 24 54 25 58" />
        <path className="m-strand" d="M72 40 C73 48 72 54 71 58" />

        <HairTies hair={hair} />

        {/* jepit rambut */}
        <rect className="m-ol m-clip-p" x="56" y="14" width="11" height="4" rx="2" transform="rotate(22 61.5 16)" />
        {hair !== 'twintail' && <rect className="m-ol m-clip-y" x="60" y="20.5" width="10" height="3.8" rx="1.9" transform="rotate(18 65 22.4)" />}
        <rect className="m-ol" fill="#fffaf2" x="26" y="23" width="8" height="3.6" rx="1.8" transform="rotate(-28 30 24.8)" />
        <circle cx="32.2" cy="22.2" r="1.3" fill="#a9d8b5" />

        {/* kilau kecil */}
        <g className="m-spark">
          <path transform="translate(86 24) scale(0.9)" d="M0 -4 Q0.8 -0.8 4 0 Q0.8 0.8 0 4 Q-0.8 0.8 -4 0 Q-0.8 -0.8 0 -4 Z" />
        </g>
        <g className="m-spark m-spark2">
          <path transform="translate(90.5 33) scale(0.5)" d="M0 -4 Q0.8 -0.8 4 0 Q0.8 0.8 0 4 Q-0.8 0.8 -4 0 Q-0.8 -0.8 0 -4 Z" />
        </g>

        {asleep && (
          <g className="m-zzz">
            <text x="77" y="13" className="m-z m-z1">z</text>
            <text x="84" y="8" className="m-z m-z2">Z</text>
          </g>
        )}
      </g>
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
  const [look, setLook] = useState<{ style: HairStyle; color: string }>({ style: 'gelombang', color: HAIR_COLORS[0].hex });

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
  const live = useRef<{ aiDlg: typeof aiDlg; bubble: boolean; greet: () => string }>({ aiDlg, bubble: !!bubble, greet: () => '' });
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
      showBubble(`Hai, aku ${NAME}! Klik aku untuk tanya AI ✨ Angkat aku juga boleh!`, { actions: true, ms: 6000 });
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
          title={`Klik ${NAME} untuk minta bantuan AI. Klik kanan untuk ganti gaya rambut.`}
          data-pose={pose}
          style={{ '--dir': dir, '--m-hair': look.color } as CSSProperties}
          onPointerEnter={onEnter}
          onPointerLeave={() => { hovering.current = false; }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onClick}
          onContextMenu={(e) => { e.preventDefault(); openPicker(); }}
        >
          <Sprite pose={pose} hair={look.style} />
        </button>
      </div>
    </div>
  );
}