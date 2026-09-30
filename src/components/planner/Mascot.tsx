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

  // Sprite digambar langsung sebagai SVG supaya tampilannya konsisten
  // dengan karakter referensi: kepala besar, rambut hitam panjang,
  // dress pink polkadot, jepit oval pink, dan bunga lily pink.
  const straightHair =
    hair === 'lurus' || hair === 'pendek' || hair === 'cepol';

  return (
    <svg className="m-sprite" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="m-face-soft" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#fff4e8" />
          <stop offset="100%" stopColor="#f6c9a9" />
        </radialGradient>
        <linearGradient id="m-dress-soft" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f7a9b8" />
          <stop offset="100%" stopColor="#ee8fa5" />
        </linearGradient>
      </defs>

      {/* bayangan tipis */}
      <ellipse className="m-shadow" cx="48" cy="93" rx="18" ry="2.4" />

      <g className="m-body-g">
        {/* RAMBUT BELAKANG — sangat panjang sampai hampir ke bawah rok */}
        {hair === 'kepang' ? (
          <>
            <path
              d="M18 30 C13 42 15 55 20 67 C17 72 16 79 20 84 C24 79 25 69 24 58 L26 34 Z"
              className="m-hair"
            />
            <path
              d="M78 30 C83 42 81 55 76 67 C79 72 80 79 76 84 C72 79 71 69 72 58 L70 34 Z"
              className="m-hair"
            />
            <circle cx="20" cy="70" r="4.2" className="m-hair-d" />
            <circle cx="76" cy="70" r="4.2" className="m-hair-d" />
            <circle cx="20" cy="78" r="3.6" className="m-hair-d" />
            <circle cx="76" cy="78" r="3.6" className="m-hair-d" />
          </>
        ) : hair === 'twintail' ? (
          <>
            <path d="M24 29 C13 25 9 38 13 53 C16 49 20 42 25 37 Z" className="m-hair" />
            <path d="M72 29 C83 25 87 38 83 53 C80 49 76 42 71 37 Z" className="m-hair" />
            <path d="M20 37 C14 49 16 62 21 72 L28 64 L27 39 Z" className="m-hair" />
            <path d="M76 37 C82 49 80 62 75 72 L68 64 L69 39 Z" className="m-hair" />
          </>
        ) : hair === 'kuncir' ? (
          <>
            <path d="M18 31 C11 41 14 59 22 73 L30 67 L27 35 Z" className="m-hair" />
            <path d="M75 30 C84 24 87 36 82 45 C79 41 76 37 72 34 Z" className="m-hair" />
            <path d="M72 36 C79 43 79 56 75 67 L68 61 L70 38 Z" className="m-hair" />
          </>
        ) : hair === 'pendek' ? (
          <path d="M18 29 C12 42 14 57 22 64 L30 61 L66 61 L74 64 C82 57 84 42 78 29 Z" className="m-hair" />
        ) : (
          <path
            d={straightHair
              ? "M17 29 C10 44 13 67 18 82 Q27 88 48 87 Q69 88 78 82 C83 67 86 44 79 29 Q70 13 48 12 Q26 13 17 29 Z"
              : "M17 29 C10 44 13 67 18 82 Q27 88 48 87 Q69 88 78 82 C83 67 86 44 79 29 Q70 13 48 12 Q26 13 17 29 Z"}
            className="m-hair"
          />
        )}

        {/* wajah besar */}
        <ellipse cx="48" cy="34" rx="29" ry="25" fill="url(#m-face-soft)" />

        {/* telinga */}
        <circle cx="19.8" cy="36" r="4.5" fill="#f4bd9e" />
        <circle cx="76.2" cy="36" r="4.5" fill="#f4bd9e" />

        {/* poni & helaian samping — digambar SETELAH wajah supaya menutupi dahi (tidak botak) */}
        <path
          className="m-hair"
          d="M18 32 C14 17 30 8 48 8 C66 8 82 17 78 32
             C75 27 72 23 68 20.5 C64 22.5 59 22.5 55 19.5
             C51 22.5 45 22.5 41 19.5 C36 22 30 23 25 21.5
             C22 24 19.5 28 18 32 Z"
        />
        <path className="m-hair-d" d="M19 30 C16 42 17 55 22 66 L28 63 C24 51 24 40 27 29 Z" />
        <path className="m-hair-d" d="M77 30 C80 42 79 55 74 66 L68 63 C72 51 72 40 69 29 Z" />

        {/* alis halus */}
        <path d="M32 25 Q36 23 40 25" fill="none" stroke="#8e6658" strokeWidth="0.7" strokeLinecap="round" opacity="0.65" />
        <path d="M56 25 Q60 23 64 25" fill="none" stroke="#8e6658" strokeWidth="0.7" strokeLinecap="round" opacity="0.65" />

        {asleep ? (
          <>
            <path d="M29 34 Q35 39 41 34" fill="none" stroke="#30221f" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M55 34 Q61 39 67 34" fill="none" stroke="#30221f" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="48" cy="43" r="1.2" fill="#9f6d63" />
          </>
        ) : scared ? (
          <>
            <ellipse cx="36" cy="34" rx="6.3" ry="7.2" fill="#251c1b" />
            <ellipse cx="60" cy="34" rx="6.3" ry="7.2" fill="#251c1b" />
            <circle cx="38.2" cy="31.2" r="2" fill="#fff" />
            <circle cx="62.2" cy="31.2" r="2" fill="#fff" />
            <circle cx="48" cy="45" r="2.4" fill="#8d5e5a" />
            <path d="M73 29 q3 3.5 0 6" fill="none" stroke="#78a7c7" strokeWidth="1.1" strokeLinecap="round" />
          </>
        ) : joy ? (
          <>
            <path d="M28.5 35 Q35 29 41 35" fill="none" stroke="#30221f" strokeWidth="2" strokeLinecap="round" />
            <path d="M55 35 Q61 29 67.5 35" fill="none" stroke="#30221f" strokeWidth="2" strokeLinecap="round" />
            <path d="M44 43 Q48 47 52 43" fill="none" stroke="#9b625d" strokeWidth="1.1" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* mata super besar dan glossy seperti ilustrasi referensi */}
            <ellipse cx="36" cy="34" rx="7.5" ry="8.8" fill="#241b1a" />
            <ellipse cx="60" cy="34" rx="7.5" ry="8.8" fill="#241b1a" />
            <circle cx="38.5" cy="30.6" r="2.4" fill="#fff" />
            <circle cx="62.5" cy="30.6" r="2.4" fill="#fff" />
            <circle cx="34.2" cy="36.7" r="1" fill="#fff" opacity="0.8" />
            <circle cx="58.2" cy="36.7" r="1" fill="#fff" opacity="0.8" />
            <path d="M28.5 27.5 l-2.2 -1.5 M30 25.5 l-1.2 -2" fill="none" stroke="#30221f" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M67.5 27.5 l2.2 -1.5 M66 25.5 l1.2 -2" fill="none" stroke="#30221f" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M44.8 43 Q48 44.2 51.2 43" fill="none" stroke="#8c5e57" strokeWidth="0.8" strokeLinecap="round" />
          </>
        )}

        {/* pipi merah muda + freckles */}
        <ellipse cx="28" cy="43" rx="7.1" ry="4.1" fill="#f39ca9" opacity="0.46" />
        <ellipse cx="68" cy="43" rx="7.1" ry="4.1" fill="#f39ca9" opacity="0.46" />
        <g fill="#c97872" opacity="0.58">
          <circle cx="24.5" cy="42.2" r="0.45" /><circle cx="27" cy="44" r="0.42" />
          <circle cx="30" cy="42.4" r="0.4" /><circle cx="32.3" cy="44.2" r="0.35" />
          <circle cx="63.7" cy="42.2" r="0.4" /><circle cx="66.5" cy="44" r="0.42" />
          <circle cx="69.3" cy="42.4" r="0.45" /><circle cx="72" cy="44" r="0.35" />
        </g>

        {/* jepit oval pink di kiri */}
        <g transform="rotate(-18 25 21)">
          <ellipse cx="25" cy="21" rx="2.2" ry="5.1" fill="none" stroke="#f19bb0" strokeWidth="2.1" />
        </g>

        {/* bunga lily pink di kanan */}
        <g transform="translate(72 19)">
          <g fill="#f5a7b7" stroke="#d98599" strokeWidth="0.45">
            <path d="M0 0 C-7 -6 -8 -13 -3 -14 C1 -15 3 -8 2 -2 Z" />
            <path d="M0 0 C-2 -9 1 -15 5 -14 C9 -12 7 -5 3 -1 Z" />
            <path d="M0 0 C5 -7 11 -8 12 -4 C13 0 7 3 2 3 Z" />
            <path d="M0 0 C7 2 9 8 5 10 C1 11 -1 5 -2 2 Z" />
            <path d="M0 0 C-4 7 -10 8 -11 4 C-12 0 -6 -3 -2 -2 Z" />
            <path d="M0 0 C-8 1 -12 -3 -10 -7 C-8 -10 -3 -6 1 -3 Z" />
          </g>
          <g fill="#9b684c">
            <circle cx="-2.8" cy="-2.4" r="0.75" />
            <circle cx="0.1" cy="-4.1" r="0.75" />
            <circle cx="3" cy="-2.6" r="0.75" />
            <circle cx="1.7" cy="0.2" r="0.75" />
          </g>
          <path d="M0 0 C0 3 -1 5 -2 7" fill="none" stroke="#80934e" strokeWidth="0.8" strokeLinecap="round" />
        </g>

        {/* LEHER + dress pink polkadot */}
        <path d="M43 56 Q48 59 53 56 L53 61 Q48 64 43 61 Z" fill="#f1b995" />
        <path
          d="M39 59 Q48 63 57 59 L62 72 Q66 79 68 83
             Q48 88 28 83 Q30 77 34 72 Z"
          fill="url(#m-dress-soft)"
          stroke="#d77f95"
          strokeWidth="0.45"
        />

        {/* kerah putih frill */}
        <path d="M39 59 Q48 64 57 59 L54 64 Q48 67 42 64 Z" fill="#fff7f1" />
        <path d="M34 72 Q48 76 62 72" fill="none" stroke="#fff4ef" strokeWidth="1.5" strokeLinecap="round" />

        {/* lengan rileks di samping, TIDAK memegang apa pun */}
        <g className="m-arm m-arm-l">
          <path d="M35 63 Q30 68 29 75" fill="none" stroke="#efb58f" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M35 62 Q31 61 29 64" fill="none" stroke="#f7a9b8" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="29" cy="75" r="2.2" fill="#efb58f" />
        </g>
        <g className="m-arm m-arm-r">
          <path d="M61 63 Q66 68 67 75" fill="none" stroke="#efb58f" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M61 62 Q65 61 67 64" fill="none" stroke="#f7a9b8" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="67" cy="75" r="2.2" fill="#efb58f" />
        </g>

        {/* polkadot putih */}
        <g fill="#fff9f5" opacity="0.9">
          <circle cx="39" cy="68" r="1.05" /><circle cx="48" cy="69.5" r="1.05" />
          <circle cx="57" cy="67.5" r="1.05" /><circle cx="34.5" cy="76" r="1.05" />
          <circle cx="43.5" cy="78" r="1.05" /><circle cx="53" cy="76" r="1.05" />
          <circle cx="62" cy="79" r="1.05" /><circle cx="39" cy="82" r="1.05" />
          <circle cx="49" cy="83.5" r="1.05" /><circle cx="58" cy="82" r="1.05" />
        </g>

        {/* rok bergelombang */}
        <path d="M28 83 Q32 85 36 84 Q40 87 44 85 Q48 88 52 85 Q56 87 60 84 Q64 85 68 83"
          fill="none" stroke="#fff7f2" strokeWidth="1.7" strokeLinecap="round" />

        {/* kaki, kaus kaki ruffle, Mary Jane pink */}
        <g className="m-leg m-leg-l">
          <rect x="39.5" y="84" width="6" height="5.5" rx="2.4" fill="#efb58f" />
          <path d="M39 88 Q42.5 86.5 46 88 L46 91.5 Q42.5 93 39 91.5 Z" fill="#fff7f2" />
          <path d="M38.2 91 Q42.4 89.5 47 91.2 L46.5 95 Q42 96 38 94.5 Z" fill="#ee8fa5" stroke="#c96e85" strokeWidth="0.45" />
          <path d="M39.2 91.7 Q42.4 93 46 91.7" fill="none" stroke="#fff1ed" strokeWidth="0.7" />
        </g>
        <g className="m-leg m-leg-r">
          <rect x="50.5" y="84" width="6" height="5.5" rx="2.4" fill="#efb58f" />
          <path d="M50 88 Q53.5 86.5 57 88 L57 91.5 Q53.5 93 50 91.5 Z" fill="#fff7f2" />
          <path d="M49.2 91 Q53.4 89.5 58 91.2 L57.5 95 Q53 96 49 94.5 Z" fill="#ee8fa5" stroke="#c96e85" strokeWidth="0.45" />
          <path d="M50.2 91.7 Q53.4 93 57 91.7" fill="none" stroke="#fff1ed" strokeWidth="0.7" />
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