'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Pembungkus <dialog> bawaan browser. Isinya hanya dibuat saat terbuka, jadi form otomatis bersih tiap dibuka. */
export function Modal({ open, onClose, wide, labelledBy, children, className }: {
  open: boolean; onClose: () => void; wide?: boolean; labelledBy?: string; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={[wide ? 'wide' : '', className ?? ''].filter(Boolean).join(' ') || undefined}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open ? children : null}
    </dialog>
  );
}