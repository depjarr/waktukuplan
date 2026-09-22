'use client';
import { useState } from 'react';
import type { AgentResult } from '@/lib/types';
import { Modal } from './Modal';
import { usePlanner } from './PlannerProvider';

const EXAMPLES = [
  'Besok jam 7 malam meeting desain di kantor',
  'Liburan ke Bali 3-5 Oktober',
  'Konser 15 Desember di Istora jam 19.30',
  'Besok ada acara apa aja?',
  'Pindahin meeting desain ke lusa jam 10',
  'Catat: beli tiket kereta',
];

function AiForm() {
  const { afterAgent, applyUndo, toast, closeAi } = usePlanner();
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'run' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState('');

  async function send() {
    const message = text.trim();
    if (!message || state === 'run') return;
    setState('run');
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungi AI');
      setResult(data as AgentResult);
      setState('done');
      setText('');
      await afterAgent(data as AgentResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghubungi AI');
      setState('error');
    }
  }

  async function undo() {
    if (!result) return;
    await applyUndo(result.undo);
    setResult(null);
    setState('idle');
    toast('Perubahan AI diurungkan');
  }

  const showIntro = state === 'idle';

  return (
    <div className="ai2">
      <div className="ai2-head">
        <span className="ai2-orb" aria-hidden="true" />
        <div className="ai2-title">
          <h3 id="aiHead">Asisten Jadwal</h3>
          <p>Ketik apa saja, aku yang urus kalendermu</p>
        </div>
        <button className="ai2-x" aria-label="Tutup" onClick={closeAi}>✕</button>
      </div>

      <div className="ai2-body">
        {showIntro && (
          <div className="ai2-cards">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="ai2-card" onClick={() => setText(ex)}>{ex}</button>
            ))}
          </div>
        )}

        {!showIntro && (
          <div className="ai2-out" aria-live="polite">
            <ol className="ai2-steps">
              <li className="done">Pesan masuk</li>
              <li className={state === 'run' ? 'run' : state === 'error' ? '' : 'done'}>AI membaca</li>
              <li className={state === 'done' ? 'done' : ''}>Masuk kalender</li>
            </ol>
            {state === 'error' && <div className="ai2-bubble ai2-bubble-error">{error}</div>}
            {state === 'done' && result && (
              <div className="ai2-bubble">
                <p>{result.reply}</p>
                {result.changes.length > 0 && (
                  <ul>{result.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                )}
                <div className="ai2-acts">
                  {result.undo.length > 0 && <button className="btn small" onClick={undo}>Urungkan</button>}
                  <button className="btn small" onClick={() => setState('idle')}>Tutup pesan</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ai2-inputbar">
        <textarea
          className="ai2-input" value={text} autoComplete="off" maxLength={600} autoFocus rows={2}
          placeholder="Ketik bebas, misal: besok jam 7 malam meeting desain di kantor"
          aria-label="Perintah untuk AI"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="ai2-send" aria-label="Kirim" onClick={send} disabled={state === 'run'}>
          {state === 'run' ? '···' : '➤'}
        </button>
      </div>
    </div>
  );
}

/** Jendela "Kirim ke AI": dibuka dari tombol di baris aksi cepat. */
export function AiDialog() {
  const { aiDlg, closeAi } = usePlanner();
  return <Modal open={aiDlg} onClose={closeAi} labelledBy="aiHead" className="ai-modal"><AiForm /></Modal>;
}