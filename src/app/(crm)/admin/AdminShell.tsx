'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { applyFullTheme } from '@/hooks/useTheme';
import { useSupportBadge } from '@/hooks/useSupportBadge';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile, Comercio } from '@/types/db';

const TIPS: Record<string, string[]> = {
  resumen:    ['Tu noche va arriba.', 'Te marco en rojo lo que se está agotando.'],
  mesas:      ['Gestiona mesas con permisos de admin y notas de auditoría.', 'Todas las acciones quedan registradas en audit_logs.'],
  reportes:   ['Descarga el PDF para enviarlo al dueño.'],
  inventario: ['Define la alerta mínima para que te avise.'],
  empleados:  ['Activa o desactiva un empleado al instante.'],
  chat:       ['Comunícate con tu equipo en tiempo real.'],
  soporte:    ['Tu Super Admin recibe tus tickets de soporte al instante.'],
  perfil:     ['Sube la foto de tu local.'],
};

interface AdminShellProps {
  profile: Profile;
  comercio: Comercio;
  view: string;
  lowStockCount?: number;
  operating?: boolean;
  returnPath?: string | null;
  children: React.ReactNode;
}

export function AdminShell({
  profile, comercio, view,
  lowStockCount = 0, operating = false, returnPath = null, children,
}: AdminShellProps) {
  const supportBadge = useSupportBadge(profile.id);
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const [brandLightbox, setBrandLightbox] = useState(false);
  const fire = (msg: string) => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };

  // Aplicar tema personal del admin al montar
  useEffect(() => {
    applyFullTheme(profile.panel_theme as Record<string, unknown>, profile.color);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = [
    { href: '/admin/resumen',    label: 'Resumen',    icon: 'dash',   title: 'Resumen del local',      sub: 'Noche en curso' },
    { href: '/admin/mesas',      label: 'Mesas',      icon: 'mesas',  title: 'Gestión de mesas',       sub: 'Control admin con auditoría' },
    { href: '/admin/reportes',   label: 'Reportes',   icon: 'chart',  title: 'Reportes',               sub: 'Ventas diarias, semanales y mensuales' },
    { href: '/admin/inventario', label: 'Inventario', icon: 'box',    title: 'Inventario y conceptos', sub: 'Stock, ganancia y alertas', badge: lowStockCount },
    { href: '/admin/empleados',  label: 'Empleados',  icon: 'users',  title: 'Empleados',              sub: 'Equipo del local' },
    { href: '/admin/chat',       label: 'Chat',       icon: 'chat',   title: 'Chat interno',           sub: 'Mensajes del equipo' },
    { href: '/admin/soporte',    label: 'Soporte',    icon: 'alert',  title: 'Soporte',                sub: 'Canal con el Super Admin', badge: supportBadge },
    { href: '/admin/perfil',     label: 'Mi local',   icon: 'user',   title: 'Mi local',               sub: 'Datos y personalización' },
  ];

  const item = nav.find(n => n.href.endsWith(view)) ?? nav[0];

  const bizInitials = comercio.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // roleThumb: foto del comercio en el botón de rol
  const roleThumb = {
    src: comercio.photo_url ?? null,
    color: comercio.color,
    initials: bizInitials,
    label: comercio.name,
  };

  return (
    <div className="app">
      <Sidebar
        profile={profile}
        navItems={nav}
        // shop footer: foto y nombre del admin (no del comercio)
        shopName={profile.full_name}
        shopSub={`Admin · ${comercio.name}`}
        shopColor={profile.color}
        shopImg={profile.avatar_url ?? null}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        returnPath={returnPath}
        // brand-mark: foto del comercio activo
        brandLogo={comercio.photo_url ?? null}
        brandFallbackColor={comercio.color}
        brandFallbackInitials={bizInitials}
        onBrandLogoClick={comercio.photo_url ? () => setBrandLightbox(true) : undefined}
        roleThumb={roleThumb}
      />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}

      <main className="main">
        <Topbar
          title={item.title}
          sub={item.sub}
          alertCount={lowStockCount}
          onMenu={() => setSideOpen(true)}
          onHelp={() => setHelp(h => !h)}
        />
        <div className="content">
          {operating && (
            <div className="operate-banner">
              <span><b>Modo operación</b> · Administras {comercio.name} con tu sesión principal.</span>
              <span>Sesión identificada como operador.</span>
            </div>
          )}
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>

      <MayloDrawer
        open={help}
        onClose={() => setHelp(false)}
        roleLabel="Admin"
        intro="Soy Maylo. Te aviso apenas un producto se va a acabar y te recuerdo cuando un turno se cierra para que nada se te escape."
        alerts={[]}
        tips={TIPS[view] ?? []}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('¡Eso! 🎺'); setTimeout(() => setDancing(false), 4800); }}
      />
      <MayloDock
        onOpen={() => setHelp(true)}
        message={lowStockCount > 0 ? `Hay ${lowStockCount} alertas de inventario.` : 'El local está listo para operar.'}
        alerts={lowStockCount}
      />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}

      {/* Lightbox brand-mark */}
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
    </div>
  );
}
