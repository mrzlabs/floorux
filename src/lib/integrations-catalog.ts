/* ============================================================
   Catálogo de integraciones FloorUX
   Cada integración suma un incremento mensual (COP) sobre la
   suscripción del comercio. `managedMonthly` es el incremento
   si OperUX administra la integración por el cliente.

   Referencias de mercado (Colombia, 2026) usadas para fijar precios:
   - Intermediarios de WhatsApp API (Wasapi, Treble): ~USD 49–99/mes (~COP 200–400k)
     → FloorUX NO usa intermediarios: conecta directo con la
       WhatsApp Cloud API de Meta. Responder a clientes dentro de
       la ventana de 24 h no tiene costo; solo las plantillas
       salientes (campañas) tienen tarifa por conversación de Meta.
   - Facturación electrónica DIAN (Aliaddo/Siigo):    ~COP 40–120k/mes
   - Herramientas de redes (Metricool/Hootsuite):     ~USD 10–50/mes
   - Community management local:                      ~COP 400k–1.5M/mes
   FloorUX cobra por debajo del proveedor directo porque agrega
   el volumen de toda la red de comercios.
   ============================================================ */

export type IntegrationCategory = 'redes' | 'campanas' | 'facturacion' | 'automatizacion';

export interface IntegrationDef {
  id: string;
  name: string;
  icon: string;
  category: IntegrationCategory;
  tagline: string;
  features: string[];
  /** Incremento mensual COP sobre la suscripción (autogestión). */
  monthly: number;
  /** Incremento mensual COP si OperUX administra. null = sin opción gestionada. */
  managedMonthly: number | null;
  /** true = solo disponible en modalidad gestionada por OperUX. */
  managedOnly?: boolean;
  badge?: string;
  /** Etiqueta del dato de conexión que se pide al vincular. */
  handleLabel?: string;
  handlePlaceholder?: string;
}

export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, { label: string; icon: string; desc: string }> = {
  redes: { label: 'Redes sociales', icon: 'globe', desc: 'Vincula tus redes y gestiónalas desde FloorUX' },
  campanas: { label: 'Campañas', icon: 'megaphone', desc: 'Publicidad y crecimiento de tu marca' },
  facturacion: { label: 'Facturación', icon: 'filecheck', desc: 'Cumplimiento DIAN sin salir del panel' },
  automatizacion: { label: 'Automatización', icon: 'workflow', desc: 'Procesos que corren solos con FloorUX' },
};

export const INTEGRATIONS_CATALOG: IntegrationDef[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: 'whatsapp',
    category: 'redes',
    tagline: 'Vincula tu número gratis: ve y responde los mensajes de tus clientes desde FloorUX.',
    features: [
      'Vinculación gratuita del número de tu negocio',
      'Bandeja de entrada: lee lo que te escriben tus clientes',
      'Responde desde la plataforma con tu número registrado',
      'Clientes que se registran desde la app quedan en tu bandeja',
    ],
    monthly: 0,
    managedMonthly: null,
    badge: 'Gratis',
    handleLabel: 'Número de WhatsApp del negocio',
    handlePlaceholder: '+57 300 000 0000',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    category: 'redes',
    tagline: 'Vincula tu cuenta gratis y sigue seguidores y alcance desde el panel.',
    features: [
      'Vinculación gratuita de la cuenta profesional',
      'Seguidores, alcance e interacción en el panel de redes',
      'Gestionado: OperUX publica y administra tu cuenta',
    ],
    monthly: 0,
    managedMonthly: 179000,
    badge: 'Gratis',
    handleLabel: 'Usuario de Instagram',
    handlePlaceholder: '@tunegocio',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    category: 'redes',
    tagline: 'Vincula tu página gratis: reseñas, mensajes y métricas en el panel.',
    features: [
      'Vinculación gratuita de la página del negocio',
      'Métricas de la página en el panel de redes',
      'Gestionado: OperUX publica y administra tu página',
    ],
    monthly: 0,
    managedMonthly: 149000,
    badge: 'Gratis',
    handleLabel: 'Página de Facebook',
    handlePlaceholder: 'facebook.com/tunegocio',
  },
  {
    id: 'whatsapp-campanas',
    name: 'Campañas WhatsApp',
    icon: 'send',
    category: 'campanas',
    tagline: 'Confirmaciones, recordatorios y promociones masivas a tus clientes.',
    features: [
      'Confirmaciones de reserva y avisos de eventos automáticos',
      'Promociones masivas a tu base de clientes',
      'Plantillas aprobadas por Meta (WhatsApp Cloud API oficial)',
      'Requiere WhatsApp Business vinculado (gratis)',
    ],
    monthly: 79000,
    managedMonthly: 199000,
  },
  {
    id: 'meta-ads',
    name: 'Campañas Meta Ads',
    icon: 'megaphone',
    category: 'campanas',
    tagline: 'Pauta en Instagram, Facebook y WhatsApp medida desde tu panel.',
    features: [
      'Creación y seguimiento de campañas desde FloorUX',
      'Resultados por campaña: alcance, clics, costo por resultado',
      'Presupuesto publicitario aparte, tú lo controlas',
      'Gestionado: OperUX diseña, segmenta y optimiza la pauta',
    ],
    monthly: 99000,
    managedMonthly: 299000,
    handleLabel: 'Cuenta publicitaria (opcional)',
    handlePlaceholder: 'ID de cuenta Meta Ads',
  },
  {
    id: 'impulso',
    name: 'Impulso OperUX',
    icon: 'rocket',
    category: 'campanas',
    tagline: 'OperUX posiciona tu negocio: contenido, parrilla y promoción cruzada en la red.',
    features: [
      'Parrilla mensual de contenido para tus redes',
      'Promoción cruzada con la comunidad de negocios OperUX',
      'Informe mensual de crecimiento y recomendaciones',
      'Incluye gestión de Instagram y Facebook',
    ],
    monthly: 0,
    managedMonthly: 349000,
    managedOnly: true,
    badge: 'Servicio OperUX',
  },
  {
    id: 'dian',
    name: 'Facturación electrónica DIAN',
    icon: 'filecheck',
    category: 'facturacion',
    tagline: 'Factura electrónica válida ante la DIAN directo desde el POS.',
    features: [
      'Emisión de factura electrónica desde el cierre de mesa',
      'Numeración, CUFE y envío al correo del cliente',
      'Vía proveedor tecnológico autorizado por la DIAN',
      'Gestionado: OperUX tramita resolución y habilitación',
    ],
    monthly: 69000,
    managedMonthly: 119000,
    badge: 'Recomendado',
    handleLabel: 'NIT del negocio',
    handlePlaceholder: '900.000.000-1',
  },
  {
    id: 'automatizaciones',
    name: 'Automatizaciones FloorUX',
    icon: 'workflow',
    category: 'automatizacion',
    tagline: 'Flujos que corren solos: stock, cierres, recordatorios y reportes.',
    features: [
      'Alerta de stock bajo directa a WhatsApp del admin',
      'Resumen de cierre de turno enviado automáticamente',
      'Recordatorios de eventos y reservas a clientes',
      'Reporte semanal automático al correo del dueño',
    ],
    monthly: 49000,
    managedMonthly: null,
  },
];

/* ---------- estado guardado en comercios.settings.integrations ---------- */

export interface IntegrationState {
  status: 'pendiente' | 'activa';
  managed: boolean;
  handle?: string;
  requestedAt: string;
  /** Métricas sincronizadas por OperUX una vez activa la conexión. */
  metrics?: {
    followers?: number;
    reach30d?: number;
    campaigns?: { name: string; status: string; reach: number; clicks: number; spend: number }[];
    syncedAt?: string;
  };
}

export type IntegrationsState = Record<string, IntegrationState>;

export function getIntegrationsState(settings: Record<string, unknown> | null | undefined): IntegrationsState {
  const raw = settings?.integrations;
  return raw && typeof raw === 'object' ? (raw as IntegrationsState) : {};
}

export function integrationMonthly(def: IntegrationDef, state: IntegrationState): number {
  return state.managed ? (def.managedMonthly ?? def.monthly) : def.monthly;
}

/** Incremento mensual total (COP) de todas las integraciones solicitadas o activas. */
export function integrationsMonthlyTotal(states: IntegrationsState): number {
  return INTEGRATIONS_CATALOG.reduce((sum, def) => {
    const st = states[def.id];
    return st ? sum + integrationMonthly(def, st) : sum;
  }, 0);
}
