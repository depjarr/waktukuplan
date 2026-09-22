'use client';
import { useNow } from '@/hooks/useNow';
import { DAYNAMES, MONTHS, pad } from '@/lib/dates';
import { usePlanner } from './PlannerProvider';

/** Jam flip yang mengikuti jam perangkat, plus ringkasan progres hari ini. */
export function Clock() {
  const now = useNow(1000);
  const { byDate, todayKey } = usePlanner();

  const tz = (() => {
    try { return (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop()?.replace(/_/g, ' ') ?? ''; }
    catch { return ''; }
  })();

  const h = now ? pad(now.getHours()) : '--';
  const m = now ? pad(now.getMinutes()) : '--';
  const today = (byDate[todayKey] ?? []).filter((e) => e.kind !== 'text');
  const done = today.filter((e) => e.done).length;

  return (
    <div className="card">
      <div className="clock" role="img" aria-label={now ? `Jam ${h} lewat ${m} menit` : 'Jam'}>
        {/* key berubah => animasi flip diputar ulang */}
        <div className="flip"><span className="num" key={h}>{h}</span><small className="l">{tz}</small></div>
        <div className="flip"><span className="num" key={m}>{m}</span><small className="r">{now ? DAYNAMES[now.getDay()] : ''}</small></div>
      </div>
      <div className="cdate">{now ? `${DAYNAMES[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}` : ' '}</div>
      <div className="prog">{today.length ? `Hari ini: ${done} dari ${today.length} selesai` : 'Hari ini belum ada jadwal'}</div>
    </div>
  );
}
