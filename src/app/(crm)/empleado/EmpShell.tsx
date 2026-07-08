'use client';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { applyFullTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile, Comercio } from '@/types/db';

const DEFAULT_PALETTE = { accent: '#7F77DD', accent2: '#27C3D8', accent3: '#B57BE0' };
const DEFAULT_THEME = { mode: 'dark', palette: [DEFAULT_PALETTE.accent, DEFAULT_PALETTE.accent2, DEFAULT_PALETTE.accent3] };

type ThemeMode = 'dark' | 'light';

function getThemeMode(theme?: Record<string, unknown> | null): ThemeMode {
  return theme?.mode === 'light' ? 'light' : 'dark';
}

function createNav(comercioName: string, unreadCount?: number) {
  return [
    { href: '/empleado/mesas', label: 'Mesas', icon: 'mesas', title: 'Mesas', sub: `Abre, despacha y cobra · ${comercioName}` },
    { href: '/empleado/inventario', label: 'Inventario', icon: 'box', title: 'Inventario', sub: `Consulta y reabastecimiento · ${comercioName}` },
    { href: '/empleado/turno', label: 'Mi turno', icon: 'clock', title: 'Mi turno', sub: `Resumen y cierre · ${comercioName}` },
    { href: '/empleado/historial', label: 'Historial', icon: 'history', title: 'Mi historial', sub: `Lo que has vendido · ${comercioName}` },
    { href: '/empleado/gastos', label: 'Gastos', icon: 'receipt', title: 'Mis gastos', sub: `Registro y evidencias · ${comercioName}` },
    { href: '/empleado/soporte', label: 'Soporte', icon: 'chat', title: 'Soporte', sub: `Solicita ayuda al equipo · ${comercioName}`, count: unreadCount },
    { href: '/empleado/chat', label: 'Chat', icon: 'chat', title: 'Chat interno', sub: `Admin y Super Admin enlazados · ${comercioName}` },
  ];
}

const TIPS: Record<string, string[]> = {
  mesas: ['Toca una mesa libre para abrirla con un alias.', 'Cada producto que sumas baja del inventario.', 'Crea las mesas que necesites con "Crear mesa".'],
  inventario: ['Consulta existencias y registra únicamente entradas positivas.', 'Usa Agregar a mesa para descontar una unidad mediante el flujo operativo.'],
  turno: ['Cierra todas las mesas antes de cerrar el turno.'],
  historial: ['Aquí queda todo lo que cobraste.'],
  gastos: ['Registra cada gasto con una evidencia JPG, PNG o PDF.', 'Solo puedes consultar tus propios registros.'],
  soporte: ['Envía tus consultas al equipo de soporte. Te responderemos pronto.', 'Puedes ver el estado de tus solicitudes y las respuestas recibidas.'],
  chat: ['Escribe al administrador o al dueño enlazado al comercio.'],
};

const GUIDES: Record<string, string[]> = {
  mesas: ['Identifica si la mesa está libre u ocupada.', 'Abre mesa con alias cuando inicia consumo.', 'Agrega productos desde el modal y confirma el total.', 'Cobra o cierra la mesa solo cuando el consumo esté completo.'],
  inventario: ['Busca el producto.', 'Revisa stock disponible y categoría.', 'Registra entrada solo si estás reabasteciendo.', 'Valida que el stock actualizado quede visible.'],
  turno: ['Revisa ventas y mesas pendientes.', 'Cierra mesas abiertas antes de finalizar.', 'Confirma totales de efectivo y otros medios.', 'Finaliza turno cuando el resumen esté correcto.'],
  historial: ['Filtra el periodo que necesitas revisar.', 'Abre el registro de venta o mesa.', 'Contrasta productos, pagos y hora.', 'Reporta diferencias al administrador.'],
  gastos: ['Selecciona concepto y monto.', 'Adjunta evidencia válida.', 'Guarda el gasto.', 'Verifica que aparezca en el historial.'],
  soporte: ['Describe el bloqueo operativo.', 'Incluye mesa, producto o pantalla afectada.', 'Envía el ticket.', 'Revisa respuesta y estado.'],
  chat: ['Abre la conversación correcta.', 'Escribe el mensaje con contexto.', 'Envía y confirma que quede en la conversación.', 'Evita duplicar solicitudes ya reportadas por soporte.'],
};

interface EmpShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function EmpShell({ profile, view, children }: EmpShellProps) {
  const [comercio, setComercio] = useState<Partial<Comercio>>({ name: '', color: '#7F77DD' });
  const [brandLightbox, setBrandLightbox] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const employeeTheme = profile.panel_theme as Record<string, unknown>;
  const employeeModeRef = useRef<ThemeMode>(getThemeMode(employeeTheme));
  const adminThemeRef = useRef<Record<string, unknown>>(DEFAULT_THEME);

  function applyEmployeeTheme(adminTheme: Record<string, unknown>, mode = employeeModeRef.current) {
    adminThemeRef.current = adminTheme;
    employeeModeRef.current = mode;
    applyFullTheme({ ...adminTheme, mode }, DEFAULT_PALETTE.accent);
  }

  useEffect(() => {
    const id = profile.comercio_id;
    if (!id) return;
    const supabase = createClient();

    // Cargar datos del comercio
    supabase.from('comercios').select('name, photo_url, color, updated_at').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setComercio(data as Comercio);
        }
      });

    // Cargar tema del admin del comercio
    async function loadAdminTheme() {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('panel_theme')
        .eq('role', 'admin')
        .eq('comercio_id', id)
        .maybeSingle();

      if (adminProfile?.panel_theme) {
        applyEmployeeTheme(adminProfile.panel_theme as Record<string, unknown>);
      } else {
        applyEmployeeTheme(DEFAULT_THEME);
      }
    }
    loadAdminTheme();

    // Cargar tickets sin leer
    async function loadUnreadTickets() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type', 'soporte')
        .eq('recipient_id', profile.id)
        .is('read_at', null);
      setUnreadTickets(count ?? 0);
    }
    loadUnreadTickets();

    const channel = supabase
      .channel(`emp-theme-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `comercio_id=eq.${id}`
      }, (payload) => {
        const row = payload.new as { panel_theme?: Record<string, unknown>; role?: string };
        if (row.role === 'admin' && row.panel_theme) {
          applyEmployeeTheme(row.panel_theme);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'comercios',
        filter: `id=eq.${id}`
      }, (payload) => {
        const row = payload.new as { name?: string; photo_url?: string; color?: string; updated_at?: string };
        setComercio(prev => ({ ...prev, ...row, photo_url: row.photo_url || prev.photo_url }));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${profile.id}`
      }, () => loadUnreadTickets())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.comercio_id, profile.id]);

  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);

  const nav = createNav(comercio.name || '', unreadTickets);
  const navItem = nav.find(n => n.href.endsWith(view)) ?? nav[0];
  const fire = (msg: string, icon = 'check') => { setToast({ msg, icon }); setTimeout(() => setToast(null), 2400); };

  // Iniciales del comercio para brand-mark
  const bizInitials = comercio.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'FL';

  return (
    <div className="app">
      <Sidebar
        profile={profile}
        navItems={nav}
        // shop footer: foto y nombre del empleado + rol + comercio (3 líneas)
        shopName={profile.full_name}
        shopSub={
          <>
            {profile.alias || profile.role}
            <br />
            <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{comercio.name}</span>
          </>
        }
        shopColor={profile.color}
        shopImg={profile.avatar_url ?? null}
        brandName={comercio.name || 'Local'}
        brandSub="FloorUX CRM"
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        // brand-mark: foto del comercio
        brandLogo={
          comercio.photo_url
            ? `${comercio.photo_url}${comercio.photo_url.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(comercio.updated_at ?? ''))}`
            : null
        }
        brandFallbackColor={comercio.color}
        brandFallbackInitials={bizInitials}
        onBrandLogoClick={comercio.photo_url ? () => setBrandLightbox(true) : undefined}
        onShopImgClick={profile.avatar_url ? () => setAvatarLightbox(true) : undefined}
      />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}

      <main className="main">
        <Topbar
          title={navItem.title}
          sub={navItem.sub}
          onMenu={() => setSideOpen(true)}
          onHelp={() => setHelp(h => !h)}
        />
        <div className="content">
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>

      <MayloDrawer
        open={help}
        onClose={() => setHelp(false)}
        roleLabel="Empleado"
        intro="Soy Maylo, tu asistente de barra. Abre mesas, despacha del inventario y yo te aviso si algo se está agotando."
        alerts={[]}
        screenLabel={navItem.title}
        guideSteps={GUIDES[view] ?? []}
        suggestions={TIPS[view] ?? []}
        tips={TIPS[view] ?? []}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('Maylo activado', 'spark'); setTimeout(() => setDancing(false), 4800); }}
      />
      <MayloDock onOpen={() => setHelp(true)} message="Estamos listos para comenzar. Abre una mesa o consulta tu turno." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}

      {/* Lightbox brand-mark (foto del comercio) */}
      {brandLightbox && comercio.photo_url && (
        <div
          onClick={() => setBrandLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={comercio.photo_url}
            alt={comercio.name}
            style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lightbox avatar (foto del empleado) */}
      {avatarLightbox && profile.avatar_url && (
        <div
          onClick={() => setAvatarLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
