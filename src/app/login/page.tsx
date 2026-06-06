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
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    <div className="login-shell">
      <div className="login-frame">
        <div className="login-brand">
          <div className="login-logo">
            FloorUX<span style={{ color: 'var(--accent)' }}>.</span>
          </div>
          <div className="login-sub">by OperUX · CRM Nightlife</div>
          {mayloReady && (
            <div className="login-maylo"
              dangerouslySetInnerHTML={{
                __html: (window as any).maylo?.({ eyes: 'open', mouth: 'smile', arms: 'wave', panel: false }) ?? '',
              }}
            />
          )}
        </div>

        <form className="card login-card" onSubmit={handleLogin}>
          <div className="login-card-h">
            <span>Acceso seguro</span>
            <h1>Iniciar sesión</h1>
            <p>Ingresa al panel asignado a tu cuenta.</p>
          </div>

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
          <button className="login-forgot" type="button" onClick={forgotPassword}>Olvidé mi contraseña</button>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Acepto los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Términos y Condiciones
              </a>{' '}
              y la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Política de Privacidad
              </a>
            </span>
          </label>

          <button className="btn pri block" type="submit" disabled={loading || !termsAccepted} style={{ marginTop: 16, height: 48 }}>
            {loading ? 'Ingresando…' : <><Icon name="lock" s={16} /> Ingresar</>}
          </button>
        </form>

        <p className="login-foot">
          El acceso es solo por invitación. Contacta a tu administrador.
        </p>
      </div>
      {loading && (
        <div className="login-wait">
          <div className="login-wait-card">
            {mayloReady && <div className="login-wait-maylo" dangerouslySetInnerHTML={{ __html: (window as any).maylo?.({ eyes: 'happy', mouth: 'talk', arms: 'welcome', panel: true }) ?? '' }} />}
            <div className="login-wait-copy">
              <span className="live"><i />Conectando</span>
              <b>Estamos preparando tu panel</b>
              <p>Validando acceso y cargando el comercio asignado.</p>
            </div>
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
