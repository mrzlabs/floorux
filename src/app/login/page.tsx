'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { ROLE_ROUTES } from '@/types/roles';
import type { Role } from '@/types/roles';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [mayloReady, setMayloReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam === 'cuenta_suspendida') {
      setError('Tu cuenta está suspendida. Contacta a tu administrador.');
    }
    // init maylo
    const interval = setInterval(() => {
      // @ts-ignore
      if (typeof window.maylo === 'function') { setMayloReady(true); clearInterval(interval); }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Error de autenticación'); setLoading(false); return; }

    const { data: profile } = await supabase.from('profiles').select('role, activo').eq('id', user.id).single();
    if (!profile || !profile.activo) {
      await supabase.auth.signOut();
      setError('Tu cuenta está suspendida. Contacta a tu administrador.');
      setLoading(false);
      return;
    }

    await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', user.id);
    router.push(ROLE_ROUTES[profile.role as Role]);
  }

  async function forgotPassword() {
    setError('');
    setNotice('');
    if (!email) {
      setError('Escribe el email de la cuenta.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) setError('No se pudo enviar el enlace de recuperación.');
    else setNotice('Enlace de recuperación enviado al correo.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)' }}>
            FloorUX<span style={{ color: 'var(--accent)' }}>.</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>by OperUX · CRM Nightlife</div>
          {mayloReady && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}
              dangerouslySetInnerHTML={{
                __html: (window as any).maylo?.({ eyes: 'open', mouth: 'smile', arms: 'wave', panel: false }) ?? '',
              }}
            />
          )}
        </div>

        <form className="card" style={{ padding: 28 }} onSubmit={handleLogin}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Iniciar sesión</h2>

          {error && (
            <div className="alert-banner" style={{ marginBottom: 16 }}>
              <span className="ai"><Icon name="alert" s={16} /></span>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}
          {notice && <div className="alert-banner" style={{ marginBottom: 16 }}>{notice}</div>}

          <div className="field">
            <label>Email</label>
            <input className="inp" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="inp" type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
              <button className="btn sm" type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button>
            </div>
          </div>
          <button className="btn ghost block" type="button" onClick={forgotPassword}>Olvidé mi contraseña</button>

          <button className="btn pri block" type="submit" disabled={loading} style={{ marginTop: 20, height: 48 }}>
            {loading ? 'Ingresando…' : <><Icon name="lock" s={16} /> Ingresar</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16 }}>
          El acceso es solo por invitación. Contacta a tu administrador.
        </p>
      </div>
      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(7,5,17,.94)', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', width: 180 }}>
            {mayloReady && <div dangerouslySetInnerHTML={{ __html: (window as any).maylo?.({ eyes: 'happy', mouth: 'talk', arms: 'welcome', panel: true }) ?? '' }} />}
            <b style={{ display: 'block', marginTop: 14 }}>Estamos listos para comenzar</b>
            <span className="muted" style={{ fontSize: 12 }}>Validando acceso</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><span className="muted">Cargando…</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
