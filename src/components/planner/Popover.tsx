'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Tombol + panel kecil yang muncul di bawahnya; tertutup saat klik di luar atau tekan Esc. */
export function Popover({ trigger, children, align = 'left' }: {
  trigger: (toggle: () => void, open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="popwrap" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <>
          <div className="pop-backdrop" onClick={() => setOpen(false)} />
          <div className={`pop ${align}`}>{children(() => setOpen(false))}</div>
        </>
      )}
    </div>
  );
}