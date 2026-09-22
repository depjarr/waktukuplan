'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Stroke } from '@/lib/types';

/** Coretan pensil untuk satu bulan (ym = '2026-09'). */
export function useDrawing(userId: string, ym: string) {
  const sb = useMemo(() => createClient(), []);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStrokes([]);
    sb.from('drawings').select('strokes').eq('user_id', userId).eq('ym', ym).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.strokes) setStrokes(data.strokes as Stroke[]);
    });
    return () => {
      cancelled = true;
    };
  }, [sb, userId, ym]);

  const save = useCallback(
    (next: Stroke[]) => {
      setStrokes(next);
      sb.from('drawings').upsert({ user_id: userId, ym, strokes: next, updated_at: new Date().toISOString() }).then();
    },
    [sb, userId, ym],
  );

  return { strokes, save };
}
