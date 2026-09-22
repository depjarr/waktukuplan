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

  useEffect(() => {
    sb.from('profiles').select('ui, timezone').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const merged = { ...DEFAULT_UI, ...(data.ui as Partial<UiSettings>) };
      latest.current = merged;
      setUi(merged);
      if (data.timezone) setTimezone(data.timezone);
    });
  }, [sb, userId]);

  const updateUi = useCallback(
    (patch: Partial<UiSettings>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setUi(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        sb.from('profiles').update({ ui: latest.current }).eq('id', userId).then();
      }, 500);
    },
    [sb, userId],
  );

  return { ui, updateUi, timezone };
}
