import { redirect } from 'next/navigation';
import { Planner } from '@/components/planner/Planner';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  return <Planner userId={user.id} />;
}
