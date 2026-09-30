'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Stroke } from '@/lib/types';

/** Coretan pensil untuk SATU HARI (date = '2026-09-27'). Tabel day_drawings, terpisah dari drawings bulan. */
export function useDayDrawing(userId: string, date: string) {
  const sb = useMemo(() => createClient(), []);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    setStrokes([]);
    if (!date) return;
    let cancelled = false;
    sb.from('day_drawings').select('strokes').eq('user_id', userId).eq('date', date).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.strokes) setStrokes(data.strokes as Stroke[]);
    });
    return () => {
      cancelled = true;
    };
  }, [sb, userId, date]);

  const save = useCallback(
    (next: Stroke[]) => {
      setStrokes(next);
      if (!date) return;
      sb.from('day_drawings').upsert({ user_id: userId, date, strokes: next, updated_at: new Date().toISOString() }).then();
    },
    [sb, userId, date],
  );

  return { strokes, save };
}