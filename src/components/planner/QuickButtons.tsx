'use client';
import { Icon, type IconName } from '@/components/Icon';
import { usePlanner } from './PlannerProvider';

const ITEMS: { icon: IconName; label: string; tone: 1 | 2; open: 'ai' }[] = [
  { icon: 'sparkle', label: 'Kirim ke AI', tone: 1, open: 'ai' },
];

/** Kartu kecil berisi tombol "Kirim ke AI", ditaruh di bawah "Segera hadir". */
export function QuickButtons() {
  const { setAiDlg } = usePlanner();
  return (
    <div className="card qbtns">
      <div className="ctitle"><h2><Icon n="bolt" size={15} /> Tombol cepat</h2></div>
      <ul className="qblist">
        {ITEMS.map((it) => (
          <li key={it.open}>
            <button className="qbtn-row" onClick={() => setAiDlg(true)}>
              <span className={`qbtn-ic t${it.tone}`}><Icon n={it.icon} size={15} /></span>
              <span className="qbtn-lbl">{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}