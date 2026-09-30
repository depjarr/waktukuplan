import type { EventRow } from '@/lib/types';

/** Kode -> berapa menit sebelum jadwal dimulai. */
export const REMIND_MINUTES: Record<string, number> = {
  '5m': 5, '10m': 10, '15m': 15, '30m': 30, '1h': 60, '3h': 180, '1d': 1440, '3d': 4320,
};

export const REMIND_LABELS: Record<string, string> = {
  '5m': '5 menit', '10m': '10 menit', '15m': '15 menit', '30m': '30 menit',
  '1h': '1 jam', '3h': '3 jam', '1d': '1 hari', '3d': '3 hari',
};

/** Pengingat otomatis: selalu aktif untuk jadwal yang punya jam mulai. */
export const AUTO_REMIND = '10m';

/**
 * Daftar pengingat yang benar-benar berlaku untuk sebuah jadwal:
 * pilihan manual user + pengingat otomatis 10 menit (kalau punya jam mulai
 * dan belum selesai). Digabung lewat Set supaya tidak dobel kalau user juga
 * memilih 10 menit secara manual.
 */
export function effectiveRemind(e: Pick<EventRow, 'remind' | 'start_time' | 'done' | 'kind'>): string[] {
  const codes = new Set<string>(e.remind ?? []);
  if (e.start_time && !e.done && e.kind !== 'text') codes.add(AUTO_REMIND);
  return [...codes];
}