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
    <>
      <style>{`
        .lx-grid{display:grid;grid-template-columns:40% 60%;height:100vh;overflow:hidden}
        .lx-left{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:48px 40px;gap:28px;position:relative;overflow:hidden;
          background:
            radial-gradient(700px 600px at 20% 30%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 65%),
            radial-gradient(500px 400px at 85% 75%,color-mix(in srgb,var(--accent2) 16%,transparent),transparent 65%),
            var(--bg2)
        }
        .lx-left-inner{max-width:320px;width:100%;text-align:center}
        .lx-maylo{width:160px;height:160px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center}
        .lx-maylo svg{width:100%!important;height:100%!important;display:block}
        .lx-welcome-title{font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1.2;margin-bottom:12px}
        .lx-welcome-sub{font-size:14px;color:var(--muted);line-height:1.65}
        .lx-brand-pill{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;
          letter-spacing:.12em;text-transform:uppercase;color:var(--accent);
          background:color-mix(in srgb,var(--accent) 14%,transparent);
          border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);
          border-radius:999px;padding:5px 14px;margin-bottom:24px}
        .lx-right{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:48px 32px;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch
        }
        .lx-right-inner{width:100%;max-width:400px;display:flex;flex-direction:column;gap:0}
        .lx-footer{margin-top:32px;text-align:center;color:var(--muted2);font-size:12px;line-height:1.7}
        @media(max-width:860px){
          .lx-grid{
            grid-template-columns:1fr;
            grid-template-rows:auto 1fr;
            height:auto;min-height:100vh;overflow:visible
          }
          .lx-left{
            max-height:260px;padding:24px;gap:12px;overflow:hidden;
            justify-content:flex-end
          }
          .lx-left-inner{max-width:100%}
          .lx-brand-pill{margin-bottom:12px}
          .lx-maylo{width:88px;height:88px;margin-bottom:8px}
          .lx-welcome-title{font-size:18px;margin-bottom:6px}
          .lx-welcome-sub{font-size:13px;display:none}
          .lx-right{
            padding:24px 20px 48px;
            overflow:visible;align-items:stretch
          }
          .lx-right-inner{max-width:100%}
        }
      `}</style>

      <div className="lx-grid">

        {/* ── columna izquierda ── */}
        <div className="lx-left">
          <div className="lx-left-inner">
            <div className="lx-brand-pill">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', display: 'inline-block' }} />
              OperUX · CRM
            </div>

            {mayloReady ? (
              <div className="lx-maylo"
                dangerouslySetInnerHTML={{
                  __html: (window as any).maylo?.({ eyes: 'open', mouth: 'smile', arms: 'welcome', panel: false }) ?? '',
                }}
              />
            ) : (
              <div className="lx-maylo" />
            )}

            <h2 className="lx-welcome-title">
              Bienvenido a FloorUX<span style={{ color: 'var(--accent)' }}>.</span>
            </h2>
            <p className="lx-welcome-sub">
              El sistema que mueve tu noche. Gestiona mesas, inventario y turnos desde un solo lugar.
            </p>
          </div>
        </div>

        {/* ── columna derecha ── */}
        <div className="lx-right">
          <div className="lx-right-inner">

            <div className="login-brand" style={{ marginBottom: 28, textAlign: 'left' }}>
              <div className="login-logo" style={{ fontSize: 24 }}>
                FloorUX<span style={{ color: 'var(--accent)' }}>.</span>
              </div>
              <div className="login-sub" style={{ marginTop: 4 }}>CRM Nightlife · by OperUX</div>
            </div>

            <form className="card login-card" onSubmit={handleLogin} style={{ marginBottom: 0 }}>
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
                <input className="inp" type="email" placeholder="tu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>

              <div className="field">
                <label>Contraseña</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="inp" type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{ flexShrink: 0 }}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} s={18} />
                  </button>
                </div>
              </div>

              <button className="login-forgot" type="button" onClick={forgotPassword}>
                Olvidé mi contraseña
              </button>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Acepto los{' '}
                  <a href="/terminos" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    Política de Privacidad
                  </a>
                </span>
              </label>

              <button className="btn pri block" type="submit"
                disabled={loading || !termsAccepted}
                style={{ marginTop: 16, height: 48 }}>
                {loading ? 'Ingresando…' : <><Icon name="lock" s={16} /> Ingresar</>}
              </button>
            </form>

            <div className="lx-footer">
              <div>© 2026 FloorUX · Todos los derechos reservados</div>
              <div>Built with ♥ by mrzlabs</div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="login-wait">
          <div className="login-wait-card">
            {mayloReady && (
              <div className="login-wait-maylo"
                dangerouslySetInnerHTML={{
                  __html: (window as any).maylo?.({ eyes: 'happy', mouth: 'talk', arms: 'welcome', panel: true }) ?? '',
                }}
              />
            )}
            <div className="login-wait-copy">
              <span className="live"><i />Conectando</span>
              <b>Estamos preparando tu panel</b>
              <p>Validando acceso y cargando el comercio asignado.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="muted">Cargando…</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
