'use client';
import { useEffect } from 'react';
import { themeStore } from '@/lib/theme';

/** Menerapkan tema yang tersimpan saat halaman dibuka, dan mengikuti mode gelap/terang perangkat kalau mode = Otomatis. */
export function ThemeBoot() {
  useEffect(() => {
    themeStore.reapply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (themeStore.get().m === 'auto') themeStore.reapply(); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return null;
}
