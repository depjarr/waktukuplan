'use client';
import { Icon } from '@/components/Icon';
import { usePlanner } from './PlannerProvider';

/** Dua tombol kecil di kanan header: buka jendela "Kirim ke AI" dan "Hubungkan WhatsApp". */
export function AiBar() {
  const { setAiDlg, setWaDlg } = usePlanner();
  return (
    <div className="qa" aria-label="Tambah jadwal lewat AI atau WhatsApp">
      <button className="qa-btn" onClick={() => setAiDlg(true)}>
        <Icon n="sparkle" size={15} /> Kirim ke AI
      </button>
      <button className="qa-btn" onClick={() => setWaDlg(true)}>
        <Icon n="chat" size={14} /> WhatsApp
      </button>
    </div>
  );
}