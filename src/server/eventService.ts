import type { SupabaseClient } from '@supabase/supabase-js';
import { isCategory } from '@/lib/categories';
import { isDate, isTime } from '@/lib/dates';
import type { EventRow, NoteRow } from '@/lib/types';

/**
 * Fungsi-fungsi inti untuk mengubah data jadwal, dipakai oleh AI (web).
 * Setiap query SELALU memfilter user_id, jadi aman dipakai juga dengan admin client (yang melewati RLS).
 */

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function createEvent(
  sb: SupabaseClient, userId: string, input: Record<string, unknown>, source: 'ai',
): Promise<EventRow> {
  const title = str(input.title, 200);
  if (!title) throw new Error('title wajib diisi');
  if (!isDate(input.date)) throw new Error('date harus berformat YYYY-MM-DD');
  const row = {
    user_id: userId,
    title,
    date: input.date,
    start_time: isTime(input.start_time) ? input.start_time : null,
    end_time: isTime(input.end_time) ? input.end_time : null,
    category: isCategory(input.category) ? input.category : 'Lainnya',
    place: str(input.place, 200) || null,
    note: str(input.note, 500) || null,
    starred: input.starred === true,
    kind: 'event' as const,
    source,
  };
  const { data, error } = await sb.from('events').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as EventRow;
}

export async function listEvents(
  sb: SupabaseClient, userId: string, o: { from: string; to: string; query?: string },
): Promise<EventRow[]> {
  let q = sb.from('events').select('*').eq('user_id', userId).eq('kind', 'event')
    .gte('date', o.from).lte('date', o.to).order('date').order('start_time', { nullsFirst: false }).limit(60);
  const term = o.query?.trim();
  if (term) q = q.ilike('title', `%${term.replace(/[%_]/g, '')}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as EventRow[];
}

export async function getEvent(sb: SupabaseClient, userId: string, id: string): Promise<EventRow | null> {
  const { data } = await sb.from('events').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  return (data as EventRow) ?? null;
}

export async function deleteEvent(sb: SupabaseClient, userId: string, id: string): Promise<EventRow | null> {
  const before = await getEvent(sb, userId, id);
  if (!before) return null;
  const { error } = await sb.from('events').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return before;
}

export async function updateEvent(
  sb: SupabaseClient, userId: string, id: string, patch: Record<string, unknown>,
): Promise<{ before: EventRow; after: EventRow } | null> {
  const before = await getEvent(sb, userId, id);
  if (!before) return null;
  const next: Record<string, unknown> = {};
  if (str(patch.title, 200)) next.title = str(patch.title, 200);
  if (isDate(patch.date)) next.date = patch.date;
  if (patch.start_time === '' || patch.start_time === null) next.start_time = null;
  else if (isTime(patch.start_time)) next.start_time = patch.start_time;
  if (patch.end_time === '' || patch.end_time === null) next.end_time = null;
  else if (isTime(patch.end_time)) next.end_time = patch.end_time;
  if (isCategory(patch.category)) next.category = patch.category;
  if (typeof patch.place === 'string') next.place = str(patch.place, 200) || null;
  if (typeof patch.note === 'string') next.note = str(patch.note, 500) || null;
  if (typeof patch.done === 'boolean') next.done = patch.done;
  if (typeof patch.starred === 'boolean') next.starred = patch.starred;
  if (!Object.keys(next).length) return { before, after: before };
  const { data, error } = await sb.from('events').update(next).eq('user_id', userId).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return { before, after: data as EventRow };
}

export async function addNote(
  sb: SupabaseClient, userId: string, o: { title?: string; items: string[] },
): Promise<{ note: NoteRow; created: boolean }> {
  const items = o.items.map((t) => ({ t: t.slice(0, 200), ck: true, done: false })).filter((i) => i.t);
  const title = (o.title ?? '').trim().slice(0, 60);

  if (!title) {
    // tanpa judul: tambahkan ke catatan paling atas (atau bikin baru kalau belum ada)
    const { data } = await sb.from('notes').select('*').eq('user_id', userId).order('position').order('created_at').limit(1);
    const first = (data?.[0] as NoteRow | undefined) ?? null;
    if (first) {
      const merged = [...(first.items ?? []), ...items];
      const { data: upd, error } = await sb.from('notes').update({ items: merged }).eq('user_id', userId).eq('id', first.id).select().single();
      if (error) throw new Error(error.message);
      return { note: upd as NoteRow, created: false };
    }
  }
  const { data, error } = await sb.from('notes').insert({ user_id: userId, title: title || 'Catatan', items }).select().single();
  if (error) throw new Error(error.message);
  return { note: data as NoteRow, created: true };
}