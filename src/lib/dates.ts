export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const MSHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const DOWS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']; // Senin di depan
export const DAYNAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; // index = Date.getDay()

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = parseYmd(k);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const ymOf = (y: number, m: number) => `${y}-${pad(m + 1)}`;

/** 'Sel, 22 Sep' */
export const fmtDate = (k: string) => {
  const d = parseYmd(k);
  return `${DOWS[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MSHORT[d.getMonth()]}`;
};
/** 'Hari ini' / 'Besok' / 'Lusa' / 'Sel, 22 Sep' */
export const relDate = (k: string, todayKey: string) => {
  const df = Math.round((parseYmd(k).getTime() - parseYmd(todayKey).getTime()) / 864e5);
  return df === 0 ? 'Hari ini' : df === 1 ? 'Besok' : df === 2 ? 'Lusa' : fmtDate(k);
};

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
/** '1j 30m' */
export const duration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return '';
  const m = toMin(end) - toMin(start);
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h ? `${h}j` : ''}${r ? `${h ? ' ' : ''}${r}m` : ''}`;
};
export const isTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const isDate = (t: unknown): t is string => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t);

/** Tanggal 'hari ini' menurut zona waktu tertentu (dipakai di server). */
export function todayInTz(tz: string): { key: string; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const key = parts; // en-CA menghasilkan YYYY-MM-DD
  const weekday = DAYNAMES[parseYmd(key).getDay()];
  return { key, weekday };
}
