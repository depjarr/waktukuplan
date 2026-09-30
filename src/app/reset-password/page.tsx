'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ThemePicker } from '@/components/ThemePicker';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/password';

/**
 * Halaman set kata sandi baru. Dituju langsung oleh link reset dari email
 * (redirectTo: '/reset-password'). Supabase client mendeteksi kode di URL
 * sendiri dan menukarnya jadi sesi recovery di browser yang sama, lalu
 * memicu event 'PASSWORD_RECOVERY' lewat onAuthStateChange — makanya kita
 * TIDAK menukar kode lewat server (/auth/callback), karena penukaran PKCE
 * harus terjadi di browser yang sama persis dengan yang meminta reset.
 * Halaman ini juga otomatis bisa dipakai user yang sudah login biasa untuk
 * ganti kata sandi langsung (tanpa lewat link email).
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      setHasSession(ok);
      setChecking(false);
    };

    // Kalau kode di URL sudah/lagi ditukar Supabase, event ini yang menandai
    // sesi recovery siap dipakai untuk updateUser({ password }).
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') finish(true);
    });

    // Fallback: kalau halaman dibuka oleh user yang memang sudah login biasa
    // (bukan dari link email), atau event di atas sudah keburu lewat sebelum
    // listener terpasang.
    sb.auth.getUser().then(({ data }) => { if (data.user) finish(true); });

    // Kalau setelah beberapa detik tidak ada sesi sama sekali, anggap link
    // sudah tidak berlaku (kadaluarsa / sudah dipakai / dibuka di browser lain).
    const timeout = setTimeout(() => finish(false), 4000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, [sb]);

  async function submit() {
    setMsg('');
    const pwError = validatePassword(password);
    if (pwError) return setMsg(pwError);
    if (password !== confirm) return setMsg('Konfirmasi kata sandi tidak sama.');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(error.message);
    else setDone(true);
  }

  if (checking) return <main className="auth" />;

  if (!hasSession) {
    return (
      <main className="auth">
        <div className="auth-theme"><ThemePicker /></div>
        <div className="auth-card">
          <h1>waktukuplan</h1>
          <p className="auth-msg" role="alert">Link reset kata sandi sudah tidak berlaku. Minta link baru lewat halaman masuk.</p>
          <button className="btn primary" onClick={() => router.push('/login')}>Ke halaman masuk</button>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="auth">
        <div className="auth-theme"><ThemePicker /></div>
        <div className="auth-card">
          <h1>waktukuplan</h1>
          <p className="auth-sub">Kata sandi berhasil diganti</p>
          <button className="btn primary" onClick={async () => { await sb.auth.signOut(); router.push('/login'); }}>
            Masuk dengan kata sandi baru
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth">
      <div className="auth-theme"><ThemePicker /></div>
      <div className="auth-card">
        <h1>waktukuplan</h1>
        <p className="auth-sub">Buat kata sandi baru</p>
        <p className="auth-hint">Minimal 8 karakter, 1 huruf besar, dan 1 karakter unik (misalnya # * &amp;).</p>

        <label className="fld"><span>Kata sandi baru</span>
          <div className="pwd-wrap">
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="pwd-eye" onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              <Icon n={showPw ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
        </label>

        <label className="fld"><span>Konfirmasi kata sandi baru</span>
          <div className="pwd-wrap">
            <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" minLength={6}
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            <button type="button" className="pwd-eye" onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              <Icon n={showConfirm ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
        </label>

        {msg && <p className="auth-msg" role="alert">{msg}</p>}

        <button className="btn primary" onClick={submit} disabled={busy || password.length < 8 || !confirm}>
          Simpan kata sandi baru
        </button>
      </div>
    </main>
  );
}