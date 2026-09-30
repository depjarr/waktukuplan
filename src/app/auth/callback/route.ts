import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Tujuan link konfirmasi email dan link reset kata sandi dari Supabase.
 * Param `next` menentukan halaman tujuan setelah sesi berhasil dibuat
 * (default '/'). Link reset kata sandi dikirim dengan `next=/reset-password`.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') ?? '/';
  if (code) {
    const sb = await createClient();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}