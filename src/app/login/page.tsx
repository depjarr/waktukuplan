'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ThemePicker } from '@/components/ThemePicker';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/password';

type Mode = 'in' | 'up' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setMsg('');
  }

  async function submit() {
    setBusy(true);
    setMsg('');
    if (mode === 'in') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg('Email atau kata sandi salah.');
      else { router.push('/'); router.refresh(); }
    } else if (mode === 'up') {
      // Aturan kekuatan password hanya diterapkan saat DAFTAR, bukan saat
      // masuk — supaya user lama yang password-nya belum memenuhi aturan
      // baru ini tetap bisa login seperti biasa.
      const pwError = validatePassword(password);
      if (pwError) { setMsg(pwError); setBusy(false); return; }
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setMsg(error.message);
      else if (data.session) { router.push('/'); router.refresh(); }
      else setMsg('Cek emailmu untuk konfirmasi, lalu masuk.');
    } else {
      // mode === 'forgot': kirim link reset kata sandi ke email.
      // redirectTo di sini cuma fallback/allowlist — link yang benar-benar
      // dipakai user dikontrol lewat template email di Supabase Dashboard,
      // yang diarahkan ke /reset-password/confirm (halaman perantara yang
      // baru memverifikasi token saat tombolnya diklik manusia, bukan saat
      // halaman dibuka otomatis oleh email security scanner). Lihat komentar
      // di src/app/reset-password/confirm/page.tsx untuk detail & template.
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password/confirm`,
      });
      if (error) setMsg(error.message);
      else setMsg('Link reset kata sandi sudah dikirim, cek emailmu.');
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="auth-theme"><ThemePicker /></div>
      <div className="auth-card">
        <h1>waktukuplan</h1>
        <p className="auth-sub">
          {mode === 'in' ? 'Masuk ke jurnalmu' : mode === 'up' ? 'Buat jurnal baru' : 'Reset kata sandi'}
        </p>

        <label className="fld"><span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'forgot') submit(); }} />
        </label>

        {mode !== 'forgot' && (
          <label className="fld"><span>Kata sandi</span>
            <div className="pwd-wrap">
              <input type={showPw ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                minLength={mode === 'up' ? 8 : 6} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
              <button type="button" className="pwd-eye" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                <Icon n={showPw ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </label>
        )}

        {mode === 'up' && (
          <p className="auth-hint">Minimal 8 karakter, 1 huruf besar, dan 1 karakter unik (misalnya # * &amp;).</p>
        )}

        {mode === 'in' && (
          <div className="auth-links">
            <button type="button" className="linkbtn" onClick={() => switchMode('forgot')}>Lupa sandi?</button>
          </div>
        )}

        {msg && <p className="auth-msg" role="alert">{msg}</p>}

        <button className="btn primary" onClick={submit}
          disabled={busy || !email || (mode === 'in' && password.length < 6) || (mode === 'up' && password.length < 8)}>
          {mode === 'in' ? 'Masuk' : mode === 'up' ? 'Daftar' : 'Kirim link reset'}
        </button>

        {mode === 'forgot' ? (
          <button className="linkbtn" onClick={() => switchMode('in')}>Kembali ke halaman masuk</button>
        ) : (
          <button className="linkbtn" onClick={() => switchMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        )}
      </div>
    </main>
  );
}