export default function TerminosPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px', color: 'var(--ink)', fontFamily: 'var(--font)' }}>
      <a href="/login" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Volver</a>

      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', marginTop: 24, marginBottom: 6 }}>
        Términos y Condiciones
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 36 }}>FloorUX by MRZLabs · Última actualización: junio 2025</p>

      <Section title="1. Aceptación">
        Al acceder o usar FloorUX aceptas estos Términos en su totalidad. Si no estás de acuerdo, no uses el servicio.
      </Section>

      <Section title="2. Descripción del servicio">
        FloorUX es un software de gestión (CRM/POS) para bares, discotecas y tabernas, ofrecido como servicio en la nube (SaaS) por MRZLabs. Incluye control de mesas, inventario, reportes, gestión de empleados y comunicación interna.
      </Section>

      <Section title="3. Cuentas y acceso">
        El acceso es exclusivamente por invitación del administrador del comercio. Eres responsable de mantener la confidencialidad de tus credenciales. MRZLabs no se hace responsable de accesos no autorizados derivados del mal uso de contraseñas.
      </Section>

      <Section title="4. Suscripción y pagos">
        FloorUX opera bajo planes de suscripción mensual o anual. El no pago en la fecha acordada puede resultar en la suspensión temporal del servicio. Los precios están sujetos a cambios con previo aviso de 30 días.
      </Section>

      <Section title="5. Uso aceptable">
        Queda prohibido usar FloorUX para actividades ilegales, cargar contenido malicioso, intentar acceder a datos de otros comercios, o realizar ingeniería inversa del software.
      </Section>

      <Section title="6. Propiedad intelectual">
        Todo el código, diseño, marca y contenido de FloorUX son propiedad de MRZLabs. Los datos ingresados por el comercio (productos, ventas, empleados) son propiedad del comercio.
      </Section>

      <Section title="7. Disponibilidad del servicio">
        MRZLabs procura una disponibilidad del 99.5% mensual, pero no garantiza disponibilidad ininterrumpida. Mantenimientos programados se comunicarán con anticipación.
      </Section>

      <Section title="8. Limitación de responsabilidad">
        MRZLabs no será responsable por pérdidas de negocio, datos o ingresos derivados del uso o imposibilidad de uso del servicio, salvo dolo o culpa grave comprobada.
      </Section>

      <Section title="9. Terminación">
        Puedes cancelar tu suscripción en cualquier momento. MRZLabs puede suspender o terminar el acceso ante incumplimiento de estos términos.
      </Section>

      <Section title="10. Ley aplicable">
        Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se resolverá ante los tribunales competentes de Medellín, Colombia.
      </Section>

      <Section title="11. Contacto">
        Para consultas sobre estos términos escribe a{' '}
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
