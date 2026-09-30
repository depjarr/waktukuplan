/**
 * Tema warna. Satu palet = 5 warna. Warna-warna itu ditulis ke variabel CSS --t1..--t5
 * lalu base.css menurunkan semua warna lain (latar, kartu, kategori, dll) dari situ.
 *
 * Mau tambah palet sendiri? Tambahkan satu baris berisi 5 kode warna di PALETTES
 * (warna pertama = warna utama/tombol). Jangan mengubah urutan palet yang sudah ada,
 * karena pilihan tema user tersimpan sebagai nomor urut.
 */

export type ThemeMode = 'auto' | 'light' | 'dark';
export interface ThemePref { p: number; m: ThemeMode }

export const PALETTES: string[][] = [
  ['#C2416A', '#8FBFE0', '#F5B57A', '#B9A3E3', '#F2DC6B'], // 0 = bawaan
  ['#4A4AAB', '#8E4F47', '#FF9BC8', '#B3CC58', '#F8DC62'],
  ['#EA404B', '#FDF6AE', '#C6E796', '#CB995A', '#FCBB5D'],
  ['#D12D38', '#4DAFD0', '#F2A73F', '#78B946', '#F8DC62'],
  ['#FFC7D0', '#EF557F', '#9DD275', '#73CDD4', '#F8DC62'],
  ['#FABF3D', '#D74033', '#71AEF3', '#D3E044', '#F2E76E'],
  ['#F5E286', '#537C6C', '#FFA74E', '#D6E499', '#D6E499'],
  ['#FE534B', '#29AFA2', '#FD9A33', '#FFE457', '#FFE457'],
  ['#F9A30F', '#5576C5', '#FDE732', '#AD200E', '#F9E9C8'],
  ['#DE6364', '#F6C7D7', '#7B7AA2', '#94ADD9', '#F6CB99'],
  ['#7C688C', '#7C688C', '#B89A5F', '#EEB855', '#827746'],
  ['#FFADD2', '#C2EEFB', '#71BAEA', '#94ACF1', '#FFEB6F'],
  ['#FFBB68', '#84C84F', '#61CDE8', '#CEDA77', '#FFE67C'],
  ['#FAA7C7', '#ABCC8C', '#AADDEC', '#C7B0E9', '#FBE486'],
  ['#B6CFF8', '#FF7497', '#FFC8D6', '#C4D885', '#F8DC62'],
  ['#EF7694', '#C7C761', '#FFB86D', '#9FD4E6', '#FFECB6'],
  ['#969B29', '#2E262A', '#91806B', '#3E535B', '#B78A20'],
  ['#404F7E', '#202A30', '#B09462', '#D1CFC1', '#8FA6C9'],
  ['#567558', '#3D6C9F', '#BFBAB4', '#E9BE5C', '#936E56'],
  ['#4E2D1C', '#EAE4CD', '#AB6533', '#8B301E', '#738182'],
  ['#A97882', '#D9CED2', '#7B5A60', '#141414', '#A7AEAE'],
  ['#E5BA75', '#BEE2D0', '#312A32', '#703E24', '#D4BFA4'],
  ['#ABBB72', '#EEEFD5', '#292929', '#D95E7B', '#FFE4A7'],
  ['#E65F99', '#DDDACC', '#483E3D', '#BAB3CA', '#AFEDD7'],
  ['#D2EDE6', '#E6A0AD', '#684656', '#B1B983', '#B2E9D1'],
  ['#8E4E6E', '#D1DEE5', '#724734', '#374A9D', '#C2CB9F'],
  ['#91A24C', '#C98C3C', '#CABEB2', '#AA442E', '#AA442E'],
  ['#FD7399', '#AB1560', '#9ACDE8', '#F4DA7E', '#F4DA7E'],
  ['#FBBB26', '#BDD494', '#C7435B', '#59A3BC', '#59A3BC'],
];

export const DEFAULT_THEME: ThemePref = { p: 0, m: 'auto' };
export const MODE_LABELS: [ThemeMode, string][] = [['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']];

const PREF_KEY = 'wkp_theme';
const VARS_KEY = 'wkp_vars'; // nilai siap pakai; dibaca skrip kecil di <head> supaya tidak berkedip

/* ---------- hitung warna ---------- */
type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t) as RGB);
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Warna tombol/aksen harus terbaca di atas kartu. Kalau warna utama palet terlalu pucat/gelap, digeser. */
export function accentFor(c1: string, mode: 'light' | 'dark') {
  const surface = mode === 'dark' ? '#211d1f' : '#fffefc';
  const toward = mode === 'dark' ? '#ffffff' : '#000000';
  let a = c1;
  for (let i = 0; i < 24 && contrast(a, surface) < 4.2; i++) a = mix(a, toward, 0.1);
  const dark = '#1c1517';
  const on = contrast(a, '#ffffff') >= contrast(a, dark) ? '#ffffff' : dark;
  return { accent: a, on };
}

/* ---------- terapkan ke halaman ---------- */
function resolveMode(m: ThemeMode): 'light' | 'dark' {
  if (m !== 'auto') return m;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const mode = resolveMode(pref.m);
  const colors = PALETTES[pref.p] ?? PALETTES[0];
  const { accent, on } = accentFor(colors[0], mode);
  const vars: Record<string, string> = { '--accent': accent, '--on-accent': on };
  colors.forEach((c, i) => { vars[`--t${i + 1}`] = c; });
  for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
  root.dataset.mode = mode;
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
    localStorage.setItem(VARS_KEY, JSON.stringify({ vars, mode }));
  } catch { /* penyimpanan browser dimatikan: tema tetap jalan, hanya tidak diingat */ }
}

/* ---------- penyimpanan pilihan (dipakai React lewat useSyncExternalStore) ---------- */
function sanitize(x: unknown): ThemePref | null {
  if (!x || typeof x !== 'object') return null;
  const { p, m } = x as Partial<ThemePref>;
  if (typeof p !== 'number' || !Number.isInteger(p) || p < 0 || p >= PALETTES.length) return null;
  if (m !== 'auto' && m !== 'light' && m !== 'dark') return null;
  return { p, m };
}

let current: ThemePref | null = null;
const listeners = new Set<() => void>();

function get(): ThemePref {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  if (!current) {
    try { current = sanitize(JSON.parse(localStorage.getItem(PREF_KEY) || 'null')); } catch { current = null; }
    current = current ?? DEFAULT_THEME;
  }
  return current;
}

export const themeStore = {
  get,
  server: (): ThemePref => DEFAULT_THEME,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** Ganti tema. Tidak melakukan apa-apa kalau pilihannya sama dengan yang sekarang. */
  set(next: unknown) {
    const n = sanitize(next);
    if (!n) return;
    const cur = get();
    if (n.p === cur.p && n.m === cur.m) return;
    current = n;
    applyTheme(n);
    listeners.forEach((l) => l());
  },
  /** Terapkan ulang pilihan yang tersimpan (saat halaman dibuka / mode otomatis berubah). */
  reapply() { applyTheme(get()); },
};
