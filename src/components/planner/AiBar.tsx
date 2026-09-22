'use client';
import { Icon } from '@/components/Icon';
import { usePlanner } from './PlannerProvider';

/** Tombol kecil di kanan header: buka jendela "Kirim ke AI". */
export function AiBar() {
  const { setAiDlg } = usePlanner();
  return (
    <div className="qa" aria-label="Tambah jadwal lewat AI">
      <button className="qa-btn" onClick={() => setAiDlg(true)}>
        <Icon n="sparkle" size={15} /> Kirim ke AI
      </button>
    </div>
  );
}