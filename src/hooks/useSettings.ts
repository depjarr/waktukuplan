'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_UI, type UiSettings } from '@/lib/types';

/** Pengaturan tampilan (posisi catatan, panel yang tampil, dll) disimpan di profiles.ui */
export function useSettings(userId: string) {
  const sb = useMemo(() => createClient(), []);
  const [ui, setUi] = useState<UiSettings>(DEFAULT_UI);
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(ui);
  const dirty = useRef(false);

  useEffect(() => {
    sb.from('profiles').select('ui, timezone').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const merged = { ...DEFAULT_UI, ...(data.ui as Partial<UiSettings>) };
      latest.current = merged;
      setUi(merged);
      if (data.timezone) setTimezone(data.timezone);
    });
  }, [sb, userId]);

  // Paksa simpan perubahan yang masih "ketunda" (belum lewat 500ms) begitu tab
  // disembunyikan/ditutup/refresh, supaya gak ilang gara-gara keburu di-refresh.
  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    clearTimeout(timer.current);
    sb.from('profiles').update({ ui: latest.current }).eq('id', userId).then(({ error }) => {
      if (error) console.error('Gagal menyimpan pengaturan tampilan:', error.message);
    });
  }, [sb, userId]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const updateUi = useCallback(
    (patch: Partial<UiSettings>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      dirty.current = true;
      setUi(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  return { ui, updateUi, timezone };
}