const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font)' } as React.CSSProperties,
  wrap: { maxWidth: 740, margin: '0 auto', padding: '48px 24px 0' } as React.CSSProperties,
  back: { color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: 32 } as React.CSSProperties,
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'var(--accent2)', marginBottom: 8 },
  h1: { fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 6 } as React.CSSProperties,
  meta: { fontSize: 13, color: 'var(--muted)', marginBottom: 40 } as React.CSSProperties,
  hr: { border: 'none', borderTop: '1px solid var(--line)', margin: '32px 0' } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 800, marginBottom: 10, marginTop: 32, color: 'var(--ink)' } as React.CSSProperties,
  p: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 14 } as React.CSSProperties,
  li: { fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 4 } as React.CSSProperties,
  ul: { paddingLeft: 20, marginBottom: 14 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, marginBottom: 14 },
  th: { textAlign: 'left' as const, padding: '10px 14px', borderBottom: '1px solid var(--line)', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.06em', color: 'var(--muted2)' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13 },
  footer: { marginTop: 64, borderTop: '1px solid var(--line)', padding: '24px 0 48px', textAlign: 'center' as const, fontSize: 12, color: 'var(--muted2)' },
  em: { fontStyle: 'italic' as const, color: 'var(--muted2)', fontSize: 13 },
};

export default function TerminosPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <a href="/login" style={S.back}>← Volver al inicio</a>

        <div style={S.eyebrow}>OperUX · mrzlabs</div>
        <h1 style={S.h1}>Términos y Condiciones de Uso</h1>
        <p style={S.meta}>FloorUX CRM · Última actualización: junio de 2026</p>
        <hr style={S.hr} />

        <h2 style={S.h2}>1. Identificación del prestador</h2>
        <p style={S.p}>
          FloorUX CRM es un producto de <strong>mrzlabs</strong>, operado por <strong>Andrés Martínez</strong>,
          desarrollador independiente domiciliado en Colombia. Contacto:{' '}
          <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            contacto@mrzlabs.anonaddy.com
          </a>
        </p>

        <h2 style={S.h2}>2. Objeto</h2>
        <p style={S.p}>
          FloorUX es una plataforma SaaS (Software como Servicio) de gestión operativa para establecimientos de ocio
          nocturno: bares, discotecas y tabernas. Provee módulos de punto de venta (POS), control de inventario,
          gestión de turnos, reportes y administración de personal.
        </p>

        <h2 style={S.h2}>3. Aceptación</h2>
        <p style={S.p}>
          El acceso y uso de FloorUX implica la aceptación plena y sin reservas de estos Términos. Si no está de
          acuerdo, debe abstenerse de usar la plataforma.
        </p>

        <h2 style={S.h2}>4. Planes y suscripción</h2>
        <p style={S.p}>FloorUX opera bajo modelo de suscripción periódica. Los planes disponibles son:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Plan</th>
              <th style={S.th}>Precio mensual</th>
              <th style={S.th}>Precio anual</th>
              <th style={S.th}>Comercios</th>
              <th style={S.th}>Empleados</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Básico',     '$89.000 COP',   '$890.000 COP',   '1',      'Hasta 3'],
              ['Pro',        '$149.000 COP',  '$1.490.000 COP', '1',      'Ilimitados'],
              ['Red',        '$249.000 COP',  '$2.490.000 COP', 'Hasta 5','Ilimitados'],
              ['Enterprise', 'Cotización',    'Cotización',     '+5',     'Ilimitados'],
            ].map(([plan, mes, anual, com, emp]) => (
              <tr key={plan}>
                <td style={{ ...S.td, fontWeight: 700, color: 'var(--ink)' }}>{plan}</td>
                <td style={S.td}>{mes}</td>
                <td style={S.td}>{anual}</td>
                <td style={S.td}>{com}</td>
                <td style={S.td}>{emp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.p}>
          Los precios no incluyen IVA. mrzlabs se reserva el derecho de modificar los precios con un aviso previo
          de 30 días.
        </p>

        <h2 style={S.h2}>5. Período de prueba</h2>
        <p style={S.p}>
          Los comercios nuevos tienen un período de prueba gratuito de 30 días. Al vencimiento, la cuenta se
          suspende automáticamente si no se activa una suscripción pagada.
        </p>

        <h2 style={S.h2}>6. Suspensión por mora</h2>
        <p style={S.p}>
          El incumplimiento en el pago genera la suspensión automática del acceso al comercio afectado. Los datos
          se conservan por 90 días adicionales. Pasado ese término, mrzlabs podrá eliminarlos definitivamente.
        </p>

        <h2 style={S.h2}>7. Obligaciones del usuario</h2>
        <p style={S.p}>El suscriptor se compromete a:</p>
        <ul style={S.ul}>
          {[
            'Proporcionar información veraz al momento del registro',
            'Mantener la confidencialidad de sus credenciales de acceso',
            'No ceder el acceso a terceros no autorizados',
            'Usar la plataforma conforme a la ley colombiana vigente',
            'No intentar acceder a datos de otros comercios',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>

        <h2 style={S.h2}>8. Propiedad intelectual</h2>
        <p style={S.p}>
          FloorUX, su código, diseño, marca y documentación son propiedad exclusiva de mrzlabs. El suscriptor
          recibe una licencia de uso limitada, no exclusiva e intransferible. No se autoriza la reproducción,
          distribución ni ingeniería inversa del software.
        </p>

        <h2 style={S.h2}>9. Disponibilidad del servicio</h2>
        <p style={S.p}>
          mrzlabs procurará una disponibilidad del 99% mensual. No se garantiza disponibilidad ininterrumpida.
          mrzlabs no será responsable por interrupciones causadas por fallas en servicios de terceros (Supabase,
          Vercel, proveedores de internet).
        </p>

        <h2 style={S.h2}>10. Limitación de responsabilidad</h2>
        <p style={S.p}>mrzlabs no será responsable por:</p>
        <ul style={S.ul}>
          {[
            'Pérdida de datos causada por el usuario',
            'Decisiones de negocio tomadas con base en los reportes de la plataforma',
            'Daños indirectos, lucro cesante o pérdida de oportunidad',
            'Fallas de conectividad del usuario',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>
        <p style={S.p}>
          La responsabilidad máxima de mrzlabs se limita al valor pagado por el suscriptor en el mes
          inmediatamente anterior al evento que origina el reclamo.
        </p>

        <h2 style={S.h2}>11. Modificaciones</h2>
        <p style={S.p}>
          mrzlabs puede modificar estos Términos en cualquier momento. Los cambios se notificarán al correo
          registrado con 15 días de anticipación. El uso continuado de la plataforma tras la notificación implica
          aceptación.
        </p>

        <h2 style={S.h2}>12. Terminación</h2>
        <p style={S.p}>
          El suscriptor puede cancelar su suscripción en cualquier momento desde el panel de cuenta. No habrá
          reembolsos por períodos ya facturados. mrzlabs puede terminar el servicio con causa justificada (fraude,
          uso ilegal, mora reiterada) sin reembolso.
        </p>

        <h2 style={S.h2}>13. Ley aplicable y jurisdicción</h2>
        <p style={S.p}>
          Estos Términos se rigen por las leyes de la República de Colombia. Para cualquier controversia, las
          partes se someten a los jueces competentes de la ciudad de Bogotá D.C.
        </p>

        <hr style={S.hr} />
        <p style={S.em}>Para consultas: contacto@mrzlabs.anonaddy.com</p>
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
