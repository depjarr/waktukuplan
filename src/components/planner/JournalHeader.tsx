'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { deleteImage, resizeImage, uploadImage } from '@/lib/image';
import { usePlanner } from './PlannerProvider';

/** Sampul + nama jurnal, bisa diganti sendiri (mirip judul halaman di aplikasi catatan). */
export function JournalHeader() {
  const { sb, userId, ui, updateUi, toast } = usePlanner();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ui.journalName ?? '');
  const title = ui.journalName?.trim() || 'waktukuplan';

  async function onCover(file: File | undefined) {
    if (!file) return;
    const oldUrl = ui.headerImage;
    try {
      const blob = await resizeImage(file, 1400, false);
      const src = await uploadImage(sb, userId, blob);
      updateUi({ headerImage: src });
      deleteImage(sb, oldUrl).catch(() => {}); // gagal hapus gak masalah, gak ganggu UX
    } catch {
      toast('Gambar sampul gagal diunggah');
    }
  }

  function startEdit() {
    setDraft(ui.journalName ?? '');
    setEditing(true);
  }
  function saveEdit() {
    setEditing(false);
    updateUi({ journalName: draft.trim() });
  }

  return (
    <header className="jheader">
      <div className="jtitlerow">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="12" style={{ fill: 'var(--pink-l)', stroke: 'var(--accent)' }} strokeWidth="2.2" />
          <path d="M16 9v7.2l4.6 2.6" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {editing ? (
          <input
            className="jtitle-in" autoFocus maxLength={60} value={draft}
            placeholder="Beri nama jurnalmu"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          <button className="jtitle" onClick={startEdit} title="Ganti nama jurnal">{title}</button>
        )}
        <form action="/auth/signout" method="post" className="jlogout-form">
          <button className="jlogout" type="submit" title="Keluar" aria-label="Keluar">
            <Icon n="logout" size={16} />
          </button>
        </form>
      </div>
      <p className="tag">jurnal jadwal yang bisa kamu tulis sendiri atau titip ke AI</p>
      <div className="jcover" style={ui.headerImage ? { backgroundImage: `url("${ui.headerImage}")` } : undefined}>
        <div className="jcover-actions">
          <label className="mup" title="Ganti sampul">
            <Icon n="camera" size={14} />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onCover(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {ui.headerImage && (
            <button className="mup" title="Hapus sampul" aria-label="Hapus sampul" onClick={() => updateUi({ headerImage: null })}>
              <Icon n="trash" size={13} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}