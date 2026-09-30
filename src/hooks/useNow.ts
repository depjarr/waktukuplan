'use client';
import { useEffect, useState } from 'react';
import { ymd } from '@/lib/dates';

/** Jam sekarang, diperbarui tiap detik. null sebelum halaman selesai dimuat (menghindari beda tampilan server vs browser). */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** 'YYYY-MM-DD' hari ini; otomatis ganti saat lewat tengah malam. */
export function useTodayKey(): string {
  const [key, setKey] = useState(() => ymd(new Date()));
  useEffect(() => {
    const t = setInterval(() => setKey((k) => {
      const n = ymd(new Date());
      return n === k ? k : n;
    }), 20_000);
    return () => clearInterval(t);
  }, []);
  return key;
}
