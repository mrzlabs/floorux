export default function PrivacidadPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', color: 'var(--ink)', fontFamily: 'var(--font)' }}>
      <a href="/login" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Volver</a>

      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', marginTop: 24, marginBottom: 6 }}>
        Política de Privacidad
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 36 }}>FloorUX by MRZLabs · Última actualización: junio 2025</p>

      <Section title="1. Responsable del tratamiento">
        MRZLabs, con correo de contacto <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: 'var(--accent)', fontWeight: 700 }}>contacto@mrzlabs.anonaddy.com</a>, es responsable del tratamiento de los datos personales recopilados a través de FloorUX.
      </Section>

      <Section title="2. Datos que recopilamos">
        Recopilamos: nombre completo, correo electrónico, número de teléfono (opcional), datos de actividad dentro de la plataforma (ventas, inventario, turnos), y dirección IP para seguridad. No recopilamos datos de tarjetas de crédito ni información financiera sensible.
      </Section>

      <Section title="3. Finalidad del tratamiento">
        Los datos se usan para: proveer el servicio FloorUX, autenticar usuarios, generar reportes operativos del comercio, soporte técnico, y mejora del producto. No utilizamos datos para publicidad de terceros.
      </Section>

      <Section title="4. Base legal">
        El tratamiento se basa en la ejecución del contrato de suscripción y el consentimiento explícito otorgado al aceptar estos términos, conforme a la Ley 1581 de 2012 (Colombia) y sus decretos reglamentarios.
      </Section>

      <Section title="5. Compartición de datos">
        No vendemos ni cedemos datos personales a terceros. Podemos compartir datos con proveedores de infraestructura (Supabase/Vercel) bajo acuerdos de confidencialidad, exclusivamente para operar el servicio.
      </Section>

      <Section title="6. Almacenamiento y seguridad">
        Los datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo. Aplicamos control de acceso basado en roles para evitar accesos no autorizados entre comercios.
      </Section>

      <Section title="7. Retención de datos">
        Conservamos los datos mientras la suscripción esté activa. Tras la cancelación, los datos se eliminan en un plazo máximo de 90 días, salvo obligación legal de conservación.
      </Section>

      <Section title="8. Derechos del titular">
        Tienes derecho a acceder, rectificar, suprimir, portar y oponerte al tratamiento de tus datos. Ejerce estos derechos escribiendo a <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: 'var(--accent)', fontWeight: 700 }}>contacto@mrzlabs.anonaddy.com</a>.
      </Section>

      <Section title="9. Cookies">
        FloorUX usa cookies de sesión estrictamente necesarias para autenticación. No usamos cookies de rastreo ni publicidad.
      </Section>

      <Section title="10. Cambios a esta política">
        Cualquier cambio material será notificado por correo electrónico con al menos 15 días de anticipación. El uso continuado del servicio implica aceptación de la nueva política.
      </Section>

      <Section title="11. Contacto">
        Para ejercer derechos o consultas sobre privacidad:{' '}
        <a href="mailto:contacto@mrzlabs.anonaddy.com" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          contacto@mrzlabs.anonaddy.com
        </a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{children}</p>
    </div>
  );
}
