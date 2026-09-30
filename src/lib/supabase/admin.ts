import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Jika kunci service role kosong, ini akan memaksa memunculkan error eksplisit
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('KRITIS: SUPABASE_SERVICE_ROLE_KEY tidak terbaca di environment server!');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}