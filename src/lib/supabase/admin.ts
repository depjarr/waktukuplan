import { createClient } from '@supabase/supabase-js';

/**
 * Client dengan service role: MELEWATI RLS. Hanya boleh dipakai di server
 * (webhook WhatsApp), dan setiap query WAJIB memfilter user_id sendiri.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
