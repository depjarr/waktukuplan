'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg('');
    if (mode === 'in') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg('Email atau kata sandi salah.');
      else { router.push('/'); router.refresh(); }
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setMsg(error.message);
      else if (data.session) { router.push('/'); router.refresh(); }
      else setMsg('Cek emailmu untuk konfirmasi, lalu masuk.');
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="auth-theme"><ThemePicker /></div>
      <div className="auth-card">
        <h1>waktukuplan</h1>
        <p className="auth-sub">{mode === 'in' ? 'Masuk ke jurnalmu' : 'Buat jurnal baru'}</p>
        <label className="fld"><span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="fld"><span>Kata sandi</span>
          <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </label>
        {msg && <p className="auth-msg" role="alert">{msg}</p>}
        <button className="btn primary" onClick={submit} disabled={busy || !email || password.length < 6}>{mode === 'in' ? 'Masuk' : 'Daftar'}</button>
        <button className="linkbtn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
          {mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </main>
  );
}
