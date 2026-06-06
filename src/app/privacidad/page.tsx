const W = { maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' } as const;
const BACK = { color: '#7F77DD', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: 32 } as const;
const EYEBROW = { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#27C3D8', marginBottom: 8 } as const;
const H1 = { fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 6, color: '#191b27' } as const;
const META = { fontSize: 13, color: '#646678', marginBottom: 20 } as const;
const HR = { border: 'none', borderTop: '1px solid #e3e5ef', margin: '28px 0' } as const;
const H2 = { fontSize: 15, fontWeight: 800, marginBottom: 8, marginTop: 28, color: '#191b27' } as const;
const P = { fontSize: 14, color: '#646678', lineHeight: 1.75, marginBottom: 12 } as const;
const LI = { fontSize: 14, color: '#646678', lineHeight: 1.75, marginBottom: 4 } as const;
const UL = { paddingLeft: 20, marginBottom: 12 } as const;
const OL = { paddingLeft: 20, marginBottom: 12 } as const;
const STRONG = { color: '#191b27', fontWeight: 700 } as const;
const FOOT = { marginTop: 56, borderTop: '1px solid #e3e5ef', padding: '20px 0 40px', textAlign: 'center', fontSize: 12, color: '#9b9eb2' } as const;
const CHIP = { display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: 'rgba(39,195,216,0.15)', color: '#27C3D8', marginRight: 6 } as const;
const NOTA = { fontSize: 14, color: '#646678', lineHeight: 1.75, marginBottom: 20, padding: '12px 16px', background: 'rgba(39,195,216,0.08)', borderRadius: 10, borderLeft: '3px solid #27C3D8' } as const;
const LINK = { color: '#7F77DD', fontWeight: 700, textDecoration: 'none' } as const;

export default function PrivacidadPage() {
  return (
    <div style={W}>
      <a href="/login" style={BACK}>{'<-'} Volver al inicio</a>

      <div style={EYEBROW}>FloorUX CRM &middot; OperUX &middot; mrzlabs</div>
      <h1 style={H1}>Política de Tratamiento de Datos Personales</h1>
      <p style={META}>Última actualización: junio de 2026</p>
      <p style={NOTA}>
        En cumplimiento de la <strong style={STRONG}>Ley 1581 de 2012</strong>, el{' '}
        <strong style={STRONG}>Decreto 1377 de 2013</strong> y demás normas concordantes sobre
        protección de datos personales en Colombia.
      </p>
      <hr style={HR} />

      <h2 style={H2}>1. Responsable del tratamiento</h2>
      <p style={P}>
        <strong style={STRONG}>Nombre:</strong> Andrés Martínez<br />
        <strong style={STRONG}>Marca comercial:</strong> mrzlabs — OperUX<br />
        <strong style={STRONG}>Producto:</strong> FloorUX CRM<br />
        <strong style={STRONG}>Correo:</strong>{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={LINK}>contacto@mrzlabs.anonaddy.com</a><br />
        <strong style={STRONG}>País:</strong> Colombia
      </p>

      <h2 style={H2}>2. Datos que recolectamos</h2>
      <p style={P}><span style={CHIP}>Admins</span> Nombre completo · Correo · Teléfono · Datos del establecimiento (nombre, dirección, ciudad, NIT)</p>
      <p style={P}><span style={CHIP}>Empleados</span> Nombre completo · Correo · Alias operativo · Registro de turnos y ventas</p>
      <p style={P}><span style={CHIP}>Operación</span> Registros de ventas · Movimientos de inventario · Historial de turnos</p>
      <p style={P}>
        <strong style={STRONG}>No recolectamos:</strong> datos sensibles como origen racial, salud,
        orientación sexual, datos biométricos, ni información de menores de edad.
      </p>

      <h2 style={H2}>3. Finalidades del tratamiento</h2>
      <p style={P}>Los datos se tratan para:</p>
      <ol style={OL}>
        <li style={LI}>Prestar el servicio de gestión operativa contratado</li>
        <li style={LI}>Gestionar la facturación y suscripción</li>
        <li style={LI}>Enviar notificaciones del servicio (actualizaciones, vencimientos, alertas)</li>
        <li style={LI}>Generar reportes operativos internos del establecimiento</li>
        <li style={LI}>Cumplir obligaciones legales aplicables</li>
        <li style={LI}>Mejorar las funcionalidades de la plataforma</li>
      </ol>
      <p style={P}>
        Los datos <strong style={STRONG}>no se venden, ceden ni comparten</strong> con terceros
        para fines comerciales o publicitarios.
      </p>

      <h2 style={H2}>4. Derechos del titular</h2>
      <p style={P}>Conforme a la Ley 1581 de 2012, el titular de los datos tiene derecho a:</p>
      <ul style={UL}>
        <li style={LI}><strong style={STRONG}>Conocer</strong> los datos personales que reposan en FloorUX</li>
        <li style={LI}><strong style={STRONG}>Actualizar</strong> sus datos cuando sean inexactos o incompletos</li>
        <li style={LI}><strong style={STRONG}>Rectificar</strong> información incorrecta</li>
        <li style={LI}><strong style={STRONG}>Suprimir</strong> sus datos cuando no sean necesarios para la finalidad del tratamiento</li>
        <li style={LI}><strong style={STRONG}>Revocar</strong> la autorización de tratamiento en cualquier momento</li>
        <li style={LI}><strong style={STRONG}>Acceder</strong> gratuitamente a sus datos personales</li>
      </ul>
      <p style={P}>
        Para ejercer estos derechos envía solicitud a{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={LINK}>contacto@mrzlabs.anonaddy.com</a>{' '}
        indicando nombre completo, tipo y número de documento, y descripción de la solicitud.
        El término de respuesta es de <strong style={STRONG}>15 días hábiles</strong> para consultas
        y reclamos, prorrogables por 8 días hábiles adicionales con notificación previa.
      </p>

      <h2 style={H2}>5. Base legal del tratamiento</h2>
      <ul style={UL}>
        <li style={LI}>La autorización expresa del titular al momento del registro en la plataforma</li>
        <li style={LI}>La ejecución del contrato de suscripción aceptado por el usuario</li>
        <li style={LI}>El cumplimiento de obligaciones legales aplicables</li>
      </ul>

      <h2 style={H2}>6. Seguridad de los datos</h2>
      <ul style={UL}>
        <li style={LI}>Cifrado en tránsito mediante TLS/SSL</li>
        <li style={LI}>Autenticación segura con tokens de sesión (Supabase Auth)</li>
        <li style={LI}>Control de acceso por roles (RLS — Row Level Security)</li>
        <li style={LI}>Backups automáticos de la base de datos</li>
        <li style={LI}>Acceso restringido a datos por principio de mínimo privilegio</li>
      </ul>

      <h2 style={H2}>7. Conservación de los datos</h2>
      <p style={P}>
        Los datos se conservan durante la vigencia de la suscripción y por{' '}
        <strong style={STRONG}>90 días adicionales</strong> tras la cancelación o suspensión,
        período durante el cual el titular puede solicitar exportación o eliminación.
        Vencido ese término, los datos pueden ser eliminados definitivamente.
      </p>

      <h2 style={H2}>8. Transferencia internacional</h2>
      <p style={P}>
        Los datos se almacenan en servidores de <strong style={STRONG}>Supabase</strong> (AWS us-east-1)
        y <strong style={STRONG}>Vercel</strong> (infraestructura global). Ambos proveedores cuentan con
        políticas de privacidad y seguridad conformes con estándares internacionales. mrzlabs no realiza
        transferencias internacionales de datos a título independiente.
      </p>

      <h2 style={H2}>9. Modificaciones a esta política</h2>
      <p style={P}>
        mrzlabs puede actualizar esta Política en cualquier momento. Los cambios se notificarán
        al correo registrado. La versión vigente siempre estará disponible en la plataforma.
      </p>

      <h2 style={H2}>10. Contacto y reclamos</h2>
      <p style={P}>
        <strong style={STRONG}>Correo:</strong>{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={LINK}>contacto@mrzlabs.anonaddy.com</a><br />
        <strong style={STRONG}>Tiempo de respuesta:</strong> máximo 15 días hábiles
      </p>
      <p style={P}>
        Si considera que su solicitud no fue atendida adecuadamente, puede acudir a la{' '}
        <strong style={STRONG}>Superintendencia de Industria y Comercio (SIC)</strong> en{' '}
        <a href="https://www.sic.gov.co" style={LINK}>www.sic.gov.co</a>
      </p>

      <hr style={HR} />
      <p style={{ ...P, fontStyle: 'italic', color: '#9b9eb2' }}>
        Autorización: Al registrarse en FloorUX, el usuario declara haber leído, entendido y
        aceptado esta Política de Tratamiento de Datos Personales.
      </p>

      <footer style={FOOT}>
        FloorUX CRM &middot; mrzlabs &middot;{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ ...LINK }}>
          contacto@mrzlabs.anonaddy.com
        </a>
      </footer>
    </div>
  );
}
