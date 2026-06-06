const S = {
  wrap: { maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' } as React.CSSProperties,
  back: { color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: 32 } as React.CSSProperties,
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--accent2)', marginBottom: 8 },
  h1: { fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 6 } as React.CSSProperties,
  meta: { fontSize: 13, color: 'var(--muted)', marginBottom: 40 } as React.CSSProperties,
  hr: { border: 'none', borderTop: '1px solid var(--line)', margin: '32px 0' } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 800, marginBottom: 10, marginTop: 32, color: 'var(--ink)' } as React.CSSProperties,
  p: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 14 } as React.CSSProperties,
  li: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 4 } as React.CSSProperties,
  ul: { paddingLeft: 20, marginBottom: 14 } as React.CSSProperties,
  ol: { paddingLeft: 20, marginBottom: 14 } as React.CSSProperties,
  strong: { color: 'var(--ink)', fontWeight: 700 } as React.CSSProperties,
  footer: { marginTop: 64, borderTop: '1px solid var(--line)', padding: '24px 0 48px', textAlign: 'center' as const, fontSize: 12, color: 'var(--muted2)' },
  em: { fontStyle: 'italic' as const, color: 'var(--muted2)', fontSize: 13 },
  chip: { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--accent2) 16%, transparent)', color: 'var(--accent2)', marginRight: 6 } as React.CSSProperties,
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>{children}</a>
);

export default function PrivacidadPage() {
  return (
    <div className="public-page">
      <div style={S.wrap}>
        <a href="/login" style={S.back}>← Volver al inicio</a>

        <div style={S.eyebrow}>FloorUX CRM · OperUX · mrzlabs</div>
        <h1 style={S.h1}>Política de Tratamiento de Datos Personales</h1>
        <p style={S.meta}>Última actualización: junio de 2026</p>
        <p style={{ ...S.p, padding: '12px 16px', background: 'color-mix(in srgb, var(--accent2) 10%, transparent)', borderRadius: 12, borderLeft: '3px solid var(--accent2)' }}>
          En cumplimiento de la <strong style={S.strong}>Ley 1581 de 2012</strong>, el{' '}
          <strong style={S.strong}>Decreto 1377 de 2013</strong> y demás normas concordantes sobre protección de
          datos personales en Colombia.
        </p>
        <hr style={S.hr} />

        <h2 style={S.h2}>1. Responsable del tratamiento</h2>
        <p style={S.p}>
          <strong style={S.strong}>Nombre:</strong> Andrés Martínez<br />
          <strong style={S.strong}>Marca comercial:</strong> mrzlabs — OperUX<br />
          <strong style={S.strong}>Producto:</strong> FloorUX CRM<br />
          <strong style={S.strong}>Correo electrónico:</strong>{' '}
          <A href="mailto:contacto@mrzlabs.anonaddy.com">contacto@mrzlabs.anonaddy.com</A><br />
          <strong style={S.strong}>País:</strong> Colombia
        </p>

        <h2 style={S.h2}>2. Datos que recolectamos</h2>
        <p style={S.p}><span style={S.chip}>Admins</span> Nombre completo · Correo electrónico · Teléfono · Información del establecimiento (nombre, dirección, ciudad, NIT)</p>
        <p style={S.p}><span style={S.chip}>Empleados</span> Nombre completo · Correo electrónico · Alias operativo · Registro de turnos y ventas</p>
        <p style={S.p}><span style={S.chip}>Operación</span> Registros de ventas · Movimientos de inventario · Historial de turnos</p>
        <p style={S.p}>
          <strong style={S.strong}>No recolectamos:</strong> datos sensibles como origen racial, salud, orientación
          sexual, datos biométricos, ni información de menores de edad.
        </p>

        <h2 style={S.h2}>3. Finalidades del tratamiento</h2>
        <p style={S.p}>Los datos se tratan para:</p>
        <ol style={S.ol}>
          {[
            'Prestar el servicio de gestión operativa contratado',
            'Gestionar la facturación y suscripción',
            'Enviar notificaciones del servicio (actualizaciones, vencimientos, alertas)',
            'Generar reportes operativos internos del establecimiento',
            'Cumplir obligaciones legales aplicables',
            'Mejorar las funcionalidades de la plataforma',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ol>
        <p style={S.p}>
          Los datos <strong style={S.strong}>no se venden, ceden ni comparten</strong> con terceros para fines
          comerciales o publicitarios.
        </p>

        <h2 style={S.h2}>4. Derechos del titular</h2>
        <p style={S.p}>Conforme a la Ley 1581 de 2012, el titular de los datos tiene derecho a:</p>
        <ul style={S.ul}>
          {[
            ['Conocer', 'los datos personales que reposan en FloorUX'],
            ['Actualizar', 'sus datos cuando sean inexactos o incompletos'],
            ['Rectificar', 'información incorrecta'],
            ['Suprimir', 'sus datos cuando no sean necesarios para la finalidad del tratamiento'],
            ['Revocar', 'la autorización de tratamiento en cualquier momento'],
            ['Acceder', 'gratuitamente a sus datos personales'],
          ].map(([bold, rest]) => (
            <li key={bold} style={S.li}>
              <strong style={S.strong}>{bold}</strong> {rest}
            </li>
          ))}
        </ul>
        <p style={S.p}>
          Para ejercer estos derechos envía solicitud a <A href="mailto:contacto@mrzlabs.anonaddy.com">contacto@mrzlabs.anonaddy.com</A> indicando
          nombre completo, tipo y número de documento, y descripción de la solicitud.
          El término de respuesta es de <strong style={S.strong}>15 días hábiles</strong> para consultas y reclamos,
          prorrogables por 8 días hábiles adicionales con notificación previa.
        </p>

        <h2 style={S.h2}>5. Base legal del tratamiento</h2>
        <ul style={S.ul}>
          <li style={S.li}>La autorización expresa del titular al momento del registro en la plataforma</li>
          <li style={S.li}>La ejecución del contrato de suscripción aceptado por el usuario</li>
          <li style={S.li}>El cumplimiento de obligaciones legales aplicables</li>
        </ul>

        <h2 style={S.h2}>6. Seguridad de los datos</h2>
        <ul style={S.ul}>
          {[
            'Cifrado en tránsito mediante TLS/SSL',
            'Autenticación segura con tokens de sesión (Supabase Auth)',
            'Control de acceso por roles (RLS — Row Level Security)',
            'Backups automáticos de la base de datos',
            'Acceso restringido a datos por principio de mínimo privilegio',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>

        <h2 style={S.h2}>7. Conservación de los datos</h2>
        <p style={S.p}>
          Los datos se conservan durante la vigencia de la suscripción y por{' '}
          <strong style={S.strong}>90 días adicionales</strong> tras la cancelación o suspensión, período durante
          el cual el titular puede solicitar exportación o eliminación. Vencido ese término, los datos pueden ser
          eliminados definitivamente.
        </p>

        <h2 style={S.h2}>8. Transferencia internacional</h2>
        <p style={S.p}>
          Los datos se almacenan en servidores de <strong style={S.strong}>Supabase</strong> (AWS us-east-1) y{' '}
          <strong style={S.strong}>Vercel</strong> (infraestructura global). Ambos proveedores cuentan con
          políticas de privacidad y seguridad conformes con estándares internacionales. mrzlabs no realiza
          transferencias internacionales de datos a título independiente.
        </p>

        <h2 style={S.h2}>9. Modificaciones a esta política</h2>
        <p style={S.p}>
          mrzlabs puede actualizar esta Política en cualquier momento. Los cambios se notificarán al correo
          registrado. La versión vigente siempre estará disponible en la plataforma.
        </p>

        <h2 style={S.h2}>10. Contacto y reclamos</h2>
        <p style={S.p}>
          <strong style={S.strong}>Correo:</strong>{' '}
          <A href="mailto:contacto@mrzlabs.anonaddy.com">contacto@mrzlabs.anonaddy.com</A><br />
          <strong style={S.strong}>Tiempo de respuesta:</strong> máximo 15 días hábiles
        </p>
        <p style={S.p}>
          Si considera que su solicitud no fue atendida adecuadamente, puede acudir a la{' '}
          <strong style={S.strong}>Superintendencia de Industria y Comercio (SIC)</strong> en{' '}
          <A href="https://www.sic.gov.co">www.sic.gov.co</A>
        </p>

        <hr style={S.hr} />
        <p style={S.em}>
          Autorización: Al registrarse en FloorUX, el usuario declara haber leído, entendido y aceptado esta
          Política de Tratamiento de Datos Personales.
        </p>
      </div>

      <footer style={S.footer}>
        FloorUX CRM · mrzlabs ·{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
          contacto@mrzlabs.anonaddy.com
        </a>
      </footer>
    </div>
  );
}
