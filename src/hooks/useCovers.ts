'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Gambar sampul Januari..Desember (index 0..11). */
export function useCovers(userId: string) {
  const sb = useMemo(() => createClient(), []);
  const [covers, setCovers] = useState<Record<number, string>>({});

  useEffect(() => {
    sb.from('month_covers').select('month, image_url').eq('user_id', userId).then(({ data }) => {
      if (!data) return;
      const map: Record<number, string> = {};
      data.forEach((r: { month: number; image_url: string }) => (map[r.month] = r.image_url));
      setCovers(map);
    });
  }, [sb, userId]);

  const setCover = useCallback(
    async (month: number, url: string) => {
      setCovers((c) => ({ ...c, [month]: url }));
      const { error } = await sb.from('month_covers').upsert({ user_id: userId, month, image_url: url });
      if (error) throw error;
    },
    [sb, userId],
  );

  const publicUrl = (key: string) => `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;

  return { covers, setCover, publicUrl };
}
