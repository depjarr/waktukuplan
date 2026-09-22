import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Client untuk Server Component / Route Handler. Membaca sesi login dari cookie. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Dipanggil dari Server Component (tidak boleh set cookie). Aman diabaikan,
            // karena middleware yang menyegarkan sesi.
          }
        },
      },
    },
  );
}
