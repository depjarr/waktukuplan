import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

const REMIND_MINUTES: Record<string, number> = { '10m': 10, '1h': 60, '1d': 1440 };

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // ambil jadwal yang punya reminder & belum dikirim
  const { data: events, error } = await admin
    .from('events')
    .select('id, user_id, title, date, start_time, remind')
    .not('remind', 'is', null)
    .neq('remind', '')
    .is('reminder_sent_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const ev of events ?? []) {
    const minutesBefore = REMIND_MINUTES[ev.remind as string];
    if (!minutesBefore || !ev.start_time) continue;

    const eventTime = new Date(`${ev.date}T${ev.start_time}:00`);
    const triggerTime = new Date(eventTime.getTime() - minutesBefore * 60_000);

    // udah waktunya reminder dikirim (dalam window ±1 menit karena cron jalan tiap menit)
    if (now >= triggerTime && now < eventTime) {
      const { data: userData } = await admin.auth.admin.getUserById(ev.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      await resend.emails.send({
        from: 'waktukuplan <reminder@resend.dev>', // ganti setelah domain kamu terverifikasi di Resend
        to: email,
        subject: `Pengingat: ${ev.title}`,
        html: `<p>Jadwal <b>${ev.title}</b> akan dimulai jam ${ev.start_time} hari ini.</p>`,
      });

      await admin.from('events').update({ reminder_sent_at: now.toISOString() }).eq('id', ev.id);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, checked: events?.length ?? 0, sent });
}