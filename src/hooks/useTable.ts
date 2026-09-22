'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook generik untuk satu tabel milik user:
 *  - memuat semua baris (difilter user_id)
 *  - update langsung di layar (optimistic), lalu disimpan ke Supabase
 *  - mendengarkan Realtime: perubahan dari WhatsApp/AI muncul tanpa refresh
 */
export function useTable<T extends { id: string }>(table: string, userId: string, orderBy?: string) {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; patch: Partial<T> }>());

  const reload = useCallback(async () => {
    let q = sb.from(table).select('*').eq('user_id', userId);
    if (orderBy) q = q.order(orderBy, { ascending: true });
    const { data, error } = await q;
    if (!error && data) setRows(data as T[]);
    setReady(true);
  }, [sb, table, userId, orderBy]);

  useEffect(() => {
    reload();
    const channel = sb
      .channel(`${table}-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, (p) => {
        if (p.eventType === 'DELETE') {
          const id = (p.old as { id?: string }).id;
          if (id) setRows((r) => r.filter((x) => x.id !== id));
          return;
        }
        const row = p.new as T;
        if (pending.current.has(row.id)) return; // user sedang mengetik, jangan timpa
        setRows((r) => (r.some((x) => x.id === row.id) ? r.map((x) => (x.id === row.id ? row : x)) : [...r, row]));
      })
      .subscribe();
    const pend = pending.current;
    return () => {
      sb.removeChannel(channel);
      pend.forEach((v) => clearTimeout(v.timer));
    };
  }, [sb, table, userId, reload]);

  /** Tambah baris baru. id dibuat di browser supaya tampil instan. */
  const insert = useCallback(
    async (row: Partial<T>) => {
      const full = { ...row, id: (row as { id?: string }).id ?? crypto.randomUUID(), user_id: userId } as unknown as T;
      setRows((r) => [...r, full]);
      const { error } = await sb.from(table).insert(full as never);
      if (error) {
        setRows((r) => r.filter((x) => x.id !== full.id));
        throw error;
      }
      return full;
    },
    [sb, table, userId],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const { error } = await sb.from(table).update(patch as never).eq('id', id).eq('user_id', userId);
      if (error) {
        reload();
        throw error;
      }
    },
    [sb, table, userId, reload],
  );

  /** Untuk input yang diketik terus-menerus (catatan): layar langsung berubah, database menyusul. */
  const updateDebounced = useCallback(
    (id: string, patch: Partial<T>, ms = 600) => {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const cur = pending.current.get(id);
      if (cur) clearTimeout(cur.timer);
      const merged = { ...(cur?.patch ?? {}), ...patch };
      const timer = setTimeout(async () => {
        pending.current.delete(id);
        const { error } = await sb.from(table).update(merged as never).eq('id', id).eq('user_id', userId);
        if (error) reload();
      }, ms);
      pending.current.set(id, { timer, patch: merged });
    },
    [sb, table, userId, reload],
  );

  const remove = useCallback(
    async (ids: string[]) => {
      setRows((r) => r.filter((x) => !ids.includes(x.id)));
      const { error } = await sb.from(table).delete().in('id', ids).eq('user_id', userId);
      if (error) {
        reload();
        throw error;
      }
    },
    [sb, table, userId, reload],
  );

  /** Untuk undo: kembalikan baris yang sudah dihapus / kembalikan nilai lama. */
  const upsertMany = useCallback(
    async (list: T[]) => {
      setRows((r) => {
        const ids = new Set(list.map((x) => x.id));
        return [...r.filter((x) => !ids.has(x.id)), ...list];
      });
      const { error } = await sb.from(table).upsert(list as never[]);
      if (error) {
        reload();
        throw error;
      }
    },
    [sb, table, reload],
  );

  return { rows, ready, reload, insert, update, updateDebounced, remove, upsertMany };
}
