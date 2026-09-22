import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Tujuan link konfirmasi email dari Supabase. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const sb = await createClient();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/', req.nextUrl.origin));
}
