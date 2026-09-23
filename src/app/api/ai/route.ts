import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiRateLimitError, runAgent } from '@/server/agent';

export const maxDuration = 30;

// Batas pemakaian AI per user: maks AI_LIMIT pesan setiap AI_WINDOW_SECONDS.
// Tujuannya bukan buat ngirit dari user normal, tapi nyegah spam/bot yang bisa
// ngabisin kuota atau bikin tagihan Gemini API bengkak.
const AI_LIMIT = 15;
const AI_WINDOW_SECONDS = 600; // 10 menit

/** Dipanggil dari kotak "Kirim ke AI" di web. */
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
  if (message.length > 600) return NextResponse.json({ error: 'Pesan terlalu panjang (maks 600 huruf)' }, { status: 400 });

  // Cek dulu sebelum manggil Gemini, biar request yang kena limit gak ikut kena biaya.
  const { data: allowed, error: rlError } = await sb.rpc('check_ai_rate_limit', {
    p_user_id: user.id,
    p_limit: AI_LIMIT,
    p_window_seconds: AI_WINDOW_SECONDS,
  });
  if (rlError) {
    // Kalau pengecekan limitnya sendiri error (misal migration belum dijalankan),
    // jangan sampai seluruh fitur AI ikut mati — cukup dicatat di log server.
    console.error('[ai] gagal cek rate limit:', rlError.message);
  } else if (allowed === false) {
    return NextResponse.json(
      { error: `Kamu sudah kirim banyak pesan ke AI. Coba lagi dalam beberapa menit ya.` },
      { status: 429 },
    );
  }

  const { data: profile } = await sb.from('profiles').select('timezone').eq('id', user.id).maybeSingle();

  try {
    // Memakai client milik user (bukan admin), jadi RLS tetap berlaku.
    const result = await runAgent({ sb, userId: user.id, message, timezone: profile?.timezone ?? 'Asia/Jakarta' });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[ai]', err);
    if (err instanceof AiRateLimitError) {
      return NextResponse.json({ error: 'Kuota AI gratis sedang penuh, coba lagi beberapa saat lagi' }, { status: 429 });
    }
    return NextResponse.json({ error: 'AI sedang bermasalah, coba lagi sebentar' }, { status: 502 });
  }
}