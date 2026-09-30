'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { usePlanner } from './PlannerProvider';

function AskForm() {
  const { askDlg, closeAsk } = usePlanner();
  const [v, setV] = useState('');
  if (!askDlg) return null;
  const ok = () => { const t = v.trim(); if (t) askDlg.onOk(t); closeAsk(); };
  return (
    <div className="dlg">
      <div className="dhead"><h3 id="askHead">{askDlg.title}</h3><button className="x" aria-label="Tutup" onClick={closeAsk}>✕</button></div>
      <input id="askIn" autoFocus type="text" maxLength={140} autoComplete="off" value={v} placeholder={askDlg.placeholder}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ok(); }} />
      <div className="dfoot"><span className="grow" /><button className="btn" onClick={closeAsk}>Batal</button><button className="btn primary" onClick={ok}>Simpan</button></div>
    </div>
  );
}

/** Kotak kecil untuk menulis satu baris teks (dipakai tombol "T" di tiap tanggal). */
export function AskDialog() {
  const { askDlg, closeAsk } = usePlanner();
  return <Modal open={!!askDlg} onClose={closeAsk} labelledBy="askHead"><AskForm /></Modal>;
}
