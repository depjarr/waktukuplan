'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Judul hari di tampilan itinerari, misal "Arrival & Ginza". */
export function useDayTitles(userId: string) {
  const sb = useMemo(() => createClient(), []);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    sb.from('day_titles').select('date, title').eq('user_id', userId).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((r: { date: string; title: string }) => (map[r.date] = r.title));
      setTitles(map);
    });
  }, [sb, userId]);

  const setLocal = useCallback((date: string, title: string) => setTitles((t) => ({ ...t, [date]: title })), []);
  const persist = useCallback(
    (date: string, title: string) => {
      if (!title.trim()) sb.from('day_titles').delete().eq('user_id', userId).eq('date', date).then();
      else sb.from('day_titles').upsert({ user_id: userId, date, title: title.trim() }).then();
    },
    [sb, userId],
  );

  return { titles, setLocal, persist };
}
