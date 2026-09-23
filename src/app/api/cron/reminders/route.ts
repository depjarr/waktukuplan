import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);

const REMIND_MINUTES: Record<string, number> = {
  '5m': 5, '15m': 15, '30m': 30, '1h': 60, '3h': 180, '1d': 1440, '3d': 4320,
};

const APP_TZ_OFFSET = '+07:00';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date();

    const { data: events, error } = await admin
      .from('events')
      .select('id, user_id, title, date, start_time, remind, reminders_sent')
      .not('remind', 'eq', '{}');

    if (error) {
      console.error('[Supabase Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sent = 0;
    for (const ev of events ?? []) {
      if (!ev.start_time) continue;

      const eventTime = new Date(`${ev.date}T${ev.start_time}:00${APP_TZ_OFFSET}`);
      if (Number.isNaN(eventTime.getTime())) continue;

      const alreadySent: string[] = ev.reminders_sent ?? [];
      const toSend: string[] = [];

      for (const r of (ev.remind as string[]) ?? []) {
        if (alreadySent.includes(r)) continue;
        const minutesBefore = REMIND_MINUTES[r];
        if (!minutesBefore) continue;
        const triggerTime = new Date(eventTime.getTime() - minutesBefore * 60_000);
        if (now >= triggerTime && now < eventTime) toSend.push(r);
      }

      if (toSend.length === 0) continue;

      const { data: userData, error: userError } = await admin.auth.admin.getUserById(ev.user_id);
      if (userError) {
        console.error(`[Auth Error for user ${ev.user_id}]:`, userError.message);
        continue;
      }

      const email = userData?.user?.email;
      if (!email) continue;

      const labels: Record<string, string> = {
        '5m': '5 menit', '15m': '15 menit', '30m': '30 menit', '1h': '1 jam', '3h': '3 jam', '1d': '1 hari', '3d': '3 hari',
      };
      const sentOk: string[] = [];
      for (const r of toSend) {
        const { error: sendError } = await resend.emails.send({
          from: 'waktukuplan <pengingat@waktukuplan.my.id>',
          to: email,
          subject: `Pengingat: ${ev.title}`,
          html: `<p>Jadwal <b>${ev.title}</b> akan dimulai jam ${ev.start_time} (${labels[r]} lagi).</p>`,
        });
        if (sendError) {
          console.error(`[Resend Error] gagal kirim ke ${email}:`, sendError.message);
          continue;
        }
        sentOk.push(r);
        sent++;
      }

      if (sentOk.length) {
        await admin.from('events').update({ reminders_sent: [...alreadySent, ...sentOk] }).eq('id', ev.id);
      }
    }

    return NextResponse.json({ ok: true, checked: events?.length ?? 0, sent });
  } catch (err: any) {
    console.error('[CRON FATAL ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}