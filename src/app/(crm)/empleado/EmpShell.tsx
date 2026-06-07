'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { getVisualConfig } from '@/components/shell/VisualTheme';
import { useTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile, Comercio } from '@/types/db';

const DEFAULT_PALETTE = ['#7F77DD', '#27C3D8', '#B57BE0'];

function createNav(comercioName: string, unreadCount?: number) {
  return [
    { href: '/empleado/mesas', label: 'Mesas', icon: 'mesas', title: 'Mesas', sub: `Abre, despacha y cobra · ${comercioName}` },
    { href: '/empleado/turno', label: 'Mi turno', icon: 'clock', title: 'Mi turno', sub: `Resumen, soporte y cierre · ${comercioName}`, count: unreadCount },
    { href: '/empleado/historial', label: 'Historial', icon: 'history', title: 'Mi historial', sub: `Lo que has vendido · ${comercioName}` },
    { href: '/empleado/chat', label: 'Chat', icon: 'chat', title: 'Chat interno', sub: `Admin y Super Admin enlazados · ${comercioName}` },
  ];
}

const TIPS: Record<string, string[]> = {
  mesas: ['Toca una mesa libre para abrirla con un alias.', 'Cada producto que sumas baja del inventario.', 'Crea las mesas que necesites con "Crear mesa".'],
  turno: ['Cierra todas las mesas antes de cerrar el turno.'],
  historial: ['Aquí queda todo lo que cobraste.'],
  chat: ['Escribe al administrador o al dueño enlazado al comercio.'],
};

interface EmpShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function EmpShell({ profile, view, children }: EmpShellProps) {
  const [themeMode, setThemeMode] = useState('dark');
  const [themePalette, setThemePalette] = useState(DEFAULT_PALETTE);
  const [comercio, setComercio] = useState<Partial<Comercio>>({ name: '', color: '#7F77DD' });
  const [brandLightbox, setBrandLightbox] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState(0);
  useTheme(themeMode, themePalette);

  useEffect(() => {
    const id = profile.comercio_id;
    if (!id) return;
    const supabase = createClient();

    supabase.from('comercios').select('name, photo_url, color, settings').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setComercio(data as Comercio);
          if (data.settings) {
            const cfg = getVisualConfig(data.settings as Record<string, unknown>, data.color ?? undefined);
            setThemeMode(cfg.mode);
            setThemePalette(cfg.palette);
          }
        }
      });

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comercios', filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as { settings?: Record<string, unknown>; color?: string; name?: string; photo_url?: string };
          setComercio(prev => ({ ...prev, ...row }));
          if (row.settings) {
            const cfg = getVisualConfig(row.settings, row.color ?? undefined);
            setThemeMode(cfg.mode);
            setThemePalette(cfg.palette);
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${profile.id}` },
        () => loadUnreadTickets())
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

  // roleThumb: foto del comercio en el botón de rol
  const roleThumb = {
    src: comercio.photo_url ?? null,
    color: comercio.color ?? '#7F77DD',
    initials: bizInitials,
    label: comercio.name || '',
  };

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
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        // brand-mark: foto del comercio
        brandLogo={comercio.photo_url ?? null}
        brandFallbackColor={comercio.color}
        brandFallbackInitials={bizInitials}
        onBrandLogoClick={comercio.photo_url ? () => setBrandLightbox(true) : undefined}
        onShopImgClick={profile.avatar_url ? () => setAvatarLightbox(true) : undefined}
        roleThumb={roleThumb}
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
        tips={TIPS[view] ?? []}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('¡Eso! 🎺 Maylo está skankin\'', 'spark'); setTimeout(() => setDancing(false), 4800); }}
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
