'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ThemePicker } from '@/components/ThemePicker';
import { createClient } from '@/lib/supabase/client';

/**
 * Halaman set kata sandi baru. Dituju setelah user klik link reset dari
 * email (lewat /auth/callback?next=/reset-password), tapi juga bisa
 * dipakai user yang sudah login untuk ganti kata sandi langsung.
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
    sb.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setChecking(false);
    });
  }, [sb]);

  async function submit() {
    setMsg('');
    if (password.length < 6) return setMsg('Kata sandi minimal 6 karakter.');
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
          <button className="btn primary" onClick={() => { router.push('/'); router.refresh(); }}>Lanjut ke jurnal</button>
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

        <label className="fld"><span>Kata sandi baru</span>
          <div className="pwd-wrap">
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" minLength={6}
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

        <button className="btn primary" onClick={submit} disabled={busy || password.length < 6 || !confirm}>
          Simpan kata sandi baru
        </button>
      </div>
    </main>
  );
}