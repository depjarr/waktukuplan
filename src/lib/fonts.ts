/**
 * Pilihan font. Sama pola dengan theme.ts (warna): pilihan disimpan di localStorage
 * lewat fontStore, lalu diterapkan sebagai variabel CSS --hand dan --ui. Karena nilainya
 * digabung ke bundle 'wkp_vars' yang sama dipakai tema warna, skrip anti-kedip di
 * layout.tsx otomatis ikut menerapkannya tanpa perlu diubah.
 *
 * Mau tambah pilihan font sendiri? Tambahkan satu baris di HAND_FONTS atau UI_FONTS,
 * lalu pastikan familinya juga ditambahkan ke link Google Fonts di src/app/layout.tsx.
 */

export interface FontOption { label: string; css: string }

export const HAND_FONTS: FontOption[] = [
  { label: 'Gaegu', css: "'Gaegu','Segoe Print','Comic Sans MS',cursive" },
  { label: 'Caveat', css: "'Caveat','Segoe Print','Comic Sans MS',cursive" },
  { label: 'Patrick Hand', css: "'Patrick Hand','Segoe Print','Comic Sans MS',cursive" },
  { label: 'Nanum Pen Script', css: "'Nanum Pen Script','Segoe Print','Comic Sans MS',cursive" },
  { label: 'Shadows Into Light', css: "'Shadows Into Light','Segoe Print','Comic Sans MS',cursive" },
];

export const UI_FONTS: FontOption[] = [
  { label: 'Karla', css: "'Karla','Segoe UI',system-ui,-apple-system,sans-serif" },
  { label: 'Inter', css: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" },
  { label: 'Nunito', css: "'Nunito','Segoe UI',system-ui,-apple-system,sans-serif" },
  { label: 'Poppins', css: "'Poppins','Segoe UI',system-ui,-apple-system,sans-serif" },
  { label: 'Work Sans', css: "'Work Sans','Segoe UI',system-ui,-apple-system,sans-serif" },
];

export interface FontPref { hand: number; ui: number }
export const DEFAULT_FONTS: FontPref = { hand: 0, ui: 0 };

const PREF_KEY = 'wkp_fonts';
const VARS_KEY = 'wkp_vars'; // bundle yang sama dipakai theme.ts, dibaca skrip anti-kedip di <head>

function sanitize(x: unknown): FontPref | null {
  if (!x || typeof x !== 'object') return null;
  const { hand, ui } = x as Partial<FontPref>;
  if (typeof hand !== 'number' || !Number.isInteger(hand) || hand < 0 || hand >= HAND_FONTS.length) return null;
  if (typeof ui !== 'number' || !Number.isInteger(ui) || ui < 0 || ui >= UI_FONTS.length) return null;
  return { hand, ui };
}

export function applyFonts(pref: FontPref) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars: Record<string, string> = {
    '--hand': HAND_FONTS[pref.hand]?.css ?? HAND_FONTS[0].css,
    '--ui': UI_FONTS[pref.ui]?.css ?? UI_FONTS[0].css,
  };
  for (const k of Object.keys(vars)) root.style.setProperty(k, vars[k]);
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
    // gabung ke bundle vars warna, jangan menimpa punya theme.ts
    const raw = localStorage.getItem(VARS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.vars = { ...(parsed.vars ?? {}), ...vars };
    localStorage.setItem(VARS_KEY, JSON.stringify(parsed));
  } catch { /* penyimpanan browser dimatikan: font tetap jalan, hanya tidak diingat */ }
}

let current: FontPref | null = null;
const listeners = new Set<() => void>();

function get(): FontPref {
  if (typeof window === 'undefined') return DEFAULT_FONTS;
  if (!current) {
    try { current = sanitize(JSON.parse(localStorage.getItem(PREF_KEY) || 'null')); } catch { current = null; }
    current = current ?? DEFAULT_FONTS;
  }
  return current;
}

export const fontStore = {
  get,
  server: (): FontPref => DEFAULT_FONTS,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** Ganti font. Tidak melakukan apa-apa kalau pilihannya sama dengan yang sekarang. */
  set(next: unknown) {
    const n = sanitize(next);
    if (!n) return;
    const cur = get();
    if (n.hand === cur.hand && n.ui === cur.ui) return;
    current = n;
    applyFonts(n);
    listeners.forEach((l) => l());
  },
  /** Terapkan ulang pilihan yang tersimpan (saat halaman dibuka). */
  reapply() { applyFonts(get()); },
};