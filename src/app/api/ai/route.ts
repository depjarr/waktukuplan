import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiRateLimitError, runAgent } from '@/server/agent';

export const maxDuration = 30;

/** Dipanggil dari kotak "Kirim ke AI" di web. */
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
  if (message.length > 600) return NextResponse.json({ error: 'Pesan terlalu panjang (maks 600 huruf)' }, { status: 400 });

  const { data: profile } = await sb.from('profiles').select('timezone').eq('id', user.id).maybeSingle();

  try {
    // Memakai client milik user (bukan admin), jadi RLS tetap berlaku.
    const result = await runAgent({ sb, userId: user.id, message, source: 'web', timezone: profile?.timezone ?? 'Asia/Jakarta' });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ai]', err);
    if (err instanceof AiRateLimitError) {
      return NextResponse.json({ error: 'Kuota AI gratis sedang penuh, coba lagi beberapa saat lagi' }, { status: 429 });
    }
    return NextResponse.json({ error: 'AI sedang bermasalah, coba lagi sebentar' }, { status: 502 });
  }
}
