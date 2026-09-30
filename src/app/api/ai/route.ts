import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiRateLimitError, runAgent } from '@/server/agent';

export const maxDuration = 30;

const AI_LIMIT = 15;
const AI_WINDOW_SECONDS = 600;

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
  }
  if (message.length > 600) {
    return NextResponse.json(
      { error: 'Pesan terlalu panjang (maks 600 huruf)' },
      { status: 400 }
    );
  }

  const { data: allowed, error: rlError } = await sb.rpc('check_ai_rate_limit', {
    p_user_id: user.id,
    p_limit: AI_LIMIT,
    p_window_seconds: AI_WINDOW_SECONDS,
  });

  if (rlError) {
    console.error('[ai] gagal cek rate limit:', rlError.message);
  } else if (allowed === false) {
    return NextResponse.json(
      { error: 'Kamu sudah kirim banyak pesan ke AI. Coba lagi dalam beberapa menit ya.' },
      { status: 429 }
    );
  }

  try {
    const result = await runAgent({
      sb,
      userId: user.id,
      message,
      timezone: 'Asia/Jakarta',
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[ai]', err);

    if (
      err instanceof AiRateLimitError ||
      (err instanceof Error && (err.message.includes('429') || err.message.includes('rate limit')))
    ) {
      return NextResponse.json(
        { error: 'Kuota AI sedang penuh, coba lagi dalam beberapa saat ya.' },
        { status: 429 }
      );
    }

    if (
      (err instanceof Error && err.name === 'TimeoutError') ||
      (err instanceof Error && err.message.includes('Waktu habis'))
    ) {
      return NextResponse.json(
        { error: 'Respon AI membutuhkan waktu terlalu lama. Silakan coba lagi.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'AI sedang bermasalah, coba lagi sebentar',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}