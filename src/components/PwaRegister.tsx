'use client';
import { useEffect } from 'react';

/** Mendaftarkan service worker (hanya di production) supaya web bisa di-install ke layar HP. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}