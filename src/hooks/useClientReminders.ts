'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventRow } from '@/lib/types';

// Sama persis dengan /api/cron/reminders, biar kode & label konsisten.
const REMIND_MINUTES: Record<string, number> = {
  '5m': 5, '15m': 15, '30m': 30, '1h': 60, '3h': 180, '1d': 1440, '3d': 4320,
};
const REMIND_LABELS: Record<string, string> = {
  '5m': '5 menit', '15m': '15 menit', '30m': '30 menit', '1h': '1 jam', '3h': '3 jam', '1d': '1 hari', '3d': '3 hari',
};
// Sama seperti APP_TZ_OFFSET di route cron, supaya jam yang dipakai konsisten
// dengan email, terlepas dari timezone browser si user.
const APP_TZ_OFFSET = '+07:00';
const STORAGE_KEY = 'wkp_client_reminders_shown';

function loadShown(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveShown(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* biarin, gak fatal */ }
}

export type NotifPermission = NotificationPermission | 'unsupported';

/**
 * Pengingat DI DALAM web. Selama tab ini terbuka, tiap 20 detik dicek apakah
 * ada jadwal yang waktunya sudah masuk salah satu opsi remind-nya:
 *  - selalu munculin toast di dalam app (lewat `fire`)
 *  - kalau user sudah mengizinkan, munculin juga Notification asli dari
 *    browser (tetap kelihatan walau tab di-minimize / lagi buka tab lain,
 *    TAPI TIDAK kalau browser/laptop-nya ditutup total — untuk kasus itu
 *    tetap andalkan email dari /api/cron/reminders).
 * Sudah-ditampilkan disimpan di localStorage per device, supaya reminder
 * yang sama gak muncul berulang-ulang tiap 20 detik / tiap refresh.
 */
export function useClientReminders(events: EventRow[], fire: (msg: string) => void) {
  const [permission, setPermission] = useState<NotifPermission>('default');
  const shownRef = useRef<Set<string>>(new Set());
  const fireRef = useRef(fire);
  fireRef.current = fire;

  useEffect(() => {
    shownRef.current = loadShown();
    setPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  const requestPermission = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    Notification.requestPermission().then(setPermission);
  }, []);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      let changed = false;

      // Buang catatan buat jadwal yang sudah dihapus, supaya localStorage
      // gak numpuk terus tanpa batas.
      const validIds = new Set(events.map((e) => e.id));
      for (const key of shownRef.current) {
        if (!validIds.has(key.split(':')[0])) { shownRef.current.delete(key); changed = true; }
      }

      for (const e of events) {
        const remind = e.remind ?? [];
        if (!e.start_time || remind.length === 0) continue;
        const eventTime = new Date(`${e.date}T${e.start_time}:00${APP_TZ_OFFSET}`);
        if (Number.isNaN(eventTime.getTime()) || now >= eventTime) continue;

        for (const code of remind) {
          const minutesBefore = REMIND_MINUTES[code];
          if (!minutesBefore) continue;
          const key = `${e.id}:${code}`;
          if (shownRef.current.has(key)) continue;

          const triggerTime = new Date(eventTime.getTime() - minutesBefore * 60_000);
          if (now >= triggerTime && now < eventTime) {
            const label = REMIND_LABELS[code] ?? code;
            const body = `${e.title} — ${label} lagi (jam ${e.start_time})`;
            fireRef.current(`🔔 ${body}`);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try { new Notification('Pengingat waktukuplan', { body }); } catch { /* biarin, toast tetap muncul */ }
            }
            shownRef.current.add(key);
            changed = true;
          }
        }
      }
      if (changed) saveShown(shownRef.current);
    };

    check();
    const t = setInterval(check, 20_000);
    return () => clearInterval(t);
  }, [events]);

  return { permission, requestPermission };
}