const W = { maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' } as const;
const BACK = { color: '#7F77DD', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: 32 } as const;
const EYEBROW = { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#27C3D8', marginBottom: 8 } as const;
const H1 = { fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 6, color: '#191b27' } as const;
const META = { fontSize: 13, color: '#646678', marginBottom: 32 } as const;
const HR = { border: 'none', borderTop: '1px solid #e3e5ef', margin: '28px 0' } as const;
const H2 = { fontSize: 15, fontWeight: 800, marginBottom: 8, marginTop: 28, color: '#191b27' } as const;
const P = { fontSize: 14, color: '#646678', lineHeight: 1.75, marginBottom: 12 } as const;
const LI = { fontSize: 14, color: '#646678', lineHeight: 1.75, marginBottom: 4 } as const;
const UL = { paddingLeft: 20, marginBottom: 12 } as const;
const TBL = { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 } as const;
const TH = { textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid #e3e5ef', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9b9eb2' } as const;
const TD = { padding: '9px 12px', borderBottom: '1px solid #eef0f6', color: '#646678', fontSize: 13 } as const;
const FOOT = { marginTop: 56, borderTop: '1px solid #e3e5ef', padding: '20px 0 40px', textAlign: 'center', fontSize: 12, color: '#9b9eb2' } as const;

export default function TerminosPage() {
  return (
    <div style={W}>
      <a href="/login" style={BACK}>{'<-'} Volver al inicio</a>

      <div style={EYEBROW}>OperUX &middot; mrzlabs</div>
      <h1 style={H1}>Términos y Condiciones de Uso</h1>
      <p style={META}>FloorUX CRM &middot; Última actualización: junio de 2026</p>
      <hr style={HR} />

      <h2 style={H2}>1. Identificación del prestador</h2>
      <p style={P}>
        FloorUX CRM es un producto de <strong>mrzlabs</strong>, operado por <strong>Andrés Martínez</strong>,
        desarrollador independiente domiciliado en Colombia.
        Contacto: <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: '#7F77DD', fontWeight: 700 }}>contacto@mrzlabs.anonaddy.com</a>
      </p>

      <h2 style={H2}>2. Objeto</h2>
      <p style={P}>
        FloorUX es una plataforma SaaS de gestión operativa para establecimientos de ocio nocturno:
        bares, discotecas y tabernas. Provee módulos de punto de venta (POS), control de inventario,
        gestión de turnos, reportes y administración de personal.
      </p>

      <h2 style={H2}>3. Aceptación</h2>
      <p style={P}>
        El acceso y uso de FloorUX implica la aceptación plena y sin reservas de estos Términos.
        Si no está de acuerdo, debe abstenerse de usar la plataforma.
      </p>

      <h2 style={H2}>4. Planes y suscripción</h2>
      <p style={P}>FloorUX opera bajo modelo de suscripción periódica. Planes disponibles:</p>
      <table style={TBL}>
        <thead>
          <tr>
            <th style={TH}>Plan</th>
            <th style={TH}>Mensual</th>
            <th style={TH}>Anual</th>
            <th style={TH}>Comercios</th>
            <th style={TH}>Empleados</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Básico',     '$89.000 COP',   '$890.000 COP',   '1',       'Hasta 3'],
            ['Pro',        '$149.000 COP',  '$1.490.000 COP', '1',       'Ilimitados'],
            ['Red',        '$249.000 COP',  '$2.490.000 COP', 'Hasta 5', 'Ilimitados'],
            ['Enterprise', 'Cotización',    'Cotización',     '+5',      'Ilimitados'],
          ].map(([plan, mes, anual, com, emp]) => (
            <tr key={plan}>
              <td style={{ ...TD, fontWeight: 700, color: '#191b27' }}>{plan}</td>
              <td style={TD}>{mes}</td>
              <td style={TD}>{anual}</td>
              <td style={TD}>{com}</td>
              <td style={TD}>{emp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={P}>Los precios no incluyen IVA. mrzlabs puede modificar precios con aviso previo de 30 días.</p>

      <h2 style={H2}>5. Período de prueba</h2>
      <p style={P}>
        Los comercios nuevos tienen un período de prueba gratuito de 30 días. Al vencimiento, la cuenta
        se suspende automáticamente si no se activa una suscripción pagada.
      </p>

      <h2 style={H2}>6. Suspensión por mora</h2>
      <p style={P}>
        El incumplimiento en el pago genera la suspensión automática del acceso al comercio afectado.
        Los datos se conservan por 90 días adicionales. Pasado ese término, mrzlabs podrá eliminarlos definitivamente.
      </p>

      <h2 style={H2}>7. Obligaciones del usuario</h2>
      <p style={P}>El suscriptor se compromete a:</p>
      <ul style={UL}>
        <li style={LI}>Proporcionar información veraz al momento del registro</li>
        <li style={LI}>Mantener la confidencialidad de sus credenciales de acceso</li>
        <li style={LI}>No ceder el acceso a terceros no autorizados</li>
        <li style={LI}>Usar la plataforma conforme a la ley colombiana vigente</li>
        <li style={LI}>No intentar acceder a datos de otros comercios</li>
      </ul>

      <h2 style={H2}>8. Propiedad intelectual</h2>
      <p style={P}>
        FloorUX, su código, diseño, marca y documentación son propiedad exclusiva de mrzlabs.
        El suscriptor recibe una licencia de uso limitada, no exclusiva e intransferible.
        No se autoriza la reproducción, distribución ni ingeniería inversa del software.
      </p>

      <h2 style={H2}>9. Disponibilidad del servicio</h2>
      <p style={P}>
        mrzlabs procurará una disponibilidad del 99% mensual. No se garantiza disponibilidad ininterrumpida.
        mrzlabs no será responsable por interrupciones causadas por fallas en servicios de terceros
        (Supabase, Vercel, proveedores de internet).
      </p>

      <h2 style={H2}>10. Limitación de responsabilidad</h2>
      <p style={P}>mrzlabs no será responsable por:</p>
      <ul style={UL}>
        <li style={LI}>Pérdida de datos causada por el usuario</li>
        <li style={LI}>Decisiones de negocio tomadas con base en los reportes de la plataforma</li>
        <li style={LI}>Daños indirectos, lucro cesante o pérdida de oportunidad</li>
        <li style={LI}>Fallas de conectividad del usuario</li>
      </ul>
      <p style={P}>
        La responsabilidad máxima de mrzlabs se limita al valor pagado por el suscriptor
        en el mes inmediatamente anterior al evento que origina el reclamo.
      </p>

      <h2 style={H2}>11. Modificaciones</h2>
      <p style={P}>
        mrzlabs puede modificar estos Términos en cualquier momento. Los cambios se notificarán
        al correo registrado con 15 días de anticipación. El uso continuado implica aceptación.
      </p>

      <h2 style={H2}>12. Terminación</h2>
      <p style={P}>
        El suscriptor puede cancelar su suscripción en cualquier momento desde el panel de cuenta.
        No habrá reembolsos por períodos ya facturados. mrzlabs puede terminar el servicio con causa
        justificada (fraude, uso ilegal, mora reiterada) sin reembolso.
      </p>

      <h2 style={H2}>13. Ley aplicable y jurisdicción</h2>
      <p style={P}>
        Estos Términos se rigen por las leyes de la República de Colombia. Para cualquier controversia,
        las partes se someten a los jueces competentes de la ciudad de Bogotá D.C.
      </p>

      <hr style={HR} />
      <p style={{ ...P, fontStyle: 'italic', color: '#9b9eb2' }}>
        Para consultas: contacto@mrzlabs.anonaddy.com
      </p>

      <footer style={FOOT}>
        FloorUX CRM &middot; mrzlabs &middot;{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: '#7F77DD', fontWeight: 700, textDecoration: 'none' }}>
          contacto@mrzlabs.anonaddy.com
        </a>
      </footer>
    </div>
  );
}
