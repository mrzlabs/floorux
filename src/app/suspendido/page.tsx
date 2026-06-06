export default function SuspendidoPage() {
  return (
    <div className="login-shell">
      <div className="login-frame">
        <div className="login-brand">
          <div className="login-logo">
            FloorUX<span style={{ color: 'var(--accent)' }}>.</span>
          </div>
          <div className="login-sub">by OperUX · CRM Nightlife</div>
        </div>

        <div className="card login-card">
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'color-mix(in srgb, var(--red) 18%, transparent)',
              color: 'var(--red)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 18px', fontSize: 28,
            }}>
              ⚠
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 10 }}>
              Acceso suspendido
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              La suscripción de este comercio está inactiva.
              <br />
              Contacta al administrador o escribe a{' '}
              <a
                href="mailto:contacto@mrzlabs.anonaddy.com"
                style={{ color: 'var(--accent)', fontWeight: 700 }}
              >
                contacto@mrzlabs.anonaddy.com
              </a>
            </p>
          </div>
          <a
            href="/login"
            className="btn block"
            style={{ textAlign: 'center', textDecoration: 'none' }}
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    </div>
  );
}
