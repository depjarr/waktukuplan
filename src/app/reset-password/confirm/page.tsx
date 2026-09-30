'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { createClient } from '@/lib/supabase/client';

/**
 * Halaman PERANTARA yang dituju link reset kata sandi dari email — bukan
 * halaman final. Sengaja TIDAK memverifikasi token secara otomatis saat
 * halaman ini dibuka (GET request biasa hanya me-render HTML statis ini).
 * Verifikasi (`verifyOtp`) baru dijalankan saat tombol diklik oleh manusia.
 *
 * Alasannya: banyak email client (Gmail, Outlook, dll) & security scanner
 * otomatis mem-fetch (GET) semua link di dalam email untuk cek keamanan,
 * SEBELUM penerima sempat klik sendiri. Kalau link di email langsung
 * mengarah ke endpoint verifikasi Supabase (`.../auth/v1/verify?token=...`),
 * GET otomatis itu sudah cukup untuk "menghabiskan" token sekali-pakai —
 * jadi begitu user klik beneran, sudah `otp_expired`. Dengan menaruh
 * halaman statis ini di antaranya (email hanya berisi link ke sini,
 * bukan ke endpoint Supabase), GET otomatis dari scanner tidak
 * memicu apa pun; token baru terpakai lewat klik tombol → verifyOtp().
 *
 * Supaya alur ini aktif, ganti template email "Reset Password" di
 * Supabase Dashboard (Authentication > Email Templates) supaya link-nya
 * mengarah ke sini, bukan ke {{ .ConfirmationURL }} bawaan:
 *
 *   {{ .SiteURL }}/reset-password/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get('token_hash');
  const type = params.get('type');

  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(!tokenHash || type !== 'recovery');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!tokenHash || type !== 'recovery') setInvalid(true);
  }, [tokenHash, type]);

  async function confirm() {
    if (!tokenHash) return;
    setBusy(true);
    setMsg('');
    const sb = createClient();
    // Ini baru terjadi setelah klik manusia — bukan saat halaman dibuka.
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    setBusy(false);
    if (error) {
      setInvalid(true);
      setMsg('Link reset kata sandi sudah tidak berlaku. Minta link baru lewat halaman masuk.');
    } else {
      router.push('/reset-password');
    }
  }

  return (
    <main className="auth">
      <div className="auth-theme"><ThemePicker /></div>
      <div className="auth-card">
        <h1>waktukuplan</h1>
        {invalid ? (
          <>
            <p className="auth-msg" role="alert">
              {msg || 'Link reset kata sandi tidak valid atau sudah tidak berlaku.'}
            </p>
            <button className="btn primary" onClick={() => router.push('/login')}>
              Ke halaman masuk
            </button>
          </>
        ) : (
          <>
            <p className="auth-sub">Klik tombol di bawah untuk melanjutkan reset kata sandi.</p>
            {msg && <p className="auth-msg" role="alert">{msg}</p>}
            <button className="btn primary" onClick={confirm} disabled={busy}>
              {busy ? 'Memproses…' : 'Konfirmasi reset kata sandi'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmResetPage() {
  return (
    <Suspense fallback={<main className="auth" />}>
      <ConfirmInner />
    </Suspense>
  );
}