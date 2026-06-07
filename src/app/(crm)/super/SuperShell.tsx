'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { getVisualConfig } from '@/components/shell/VisualTheme';
import { useTheme } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Comercio } from '@/types/db';

const NAV = [
  { href: '/super', label: 'Comercios', icon: 'biz', title: 'Comercios', sub: 'Tu red de discotecas y tabernas' },
  { href: '/super/reportes', label: 'Reportes', icon: 'chart', title: 'Reportes consolidados', sub: 'Toda la red en un vistazo' },
  { href: '/super/usuarios', label: 'Administradores', icon: 'users', title: 'Administradores', sub: 'Usuarios y logueos' },
  { href: '/super/chat', label: 'Chat', icon: 'chat', title: 'Chat', sub: 'Mensajes con tu equipo' },
  { href: '/super/cuenta', label: 'Mi cuenta', icon: 'user', title: 'Mi cuenta', sub: 'Perfil del super administrador' },
];

interface SuperShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function SuperShell({ profile, view, children }: SuperShellProps) {
  const _theme = getVisualConfig(profile.panel_theme, profile.color);
  useTheme(_theme.mode, _theme.palette);

  const [brandLogo, setBrandLogo] = useState('');
  const [comercios, setComercios] = useState<Pick<Comercio, 'id' | 'name' | 'color' | 'photo_url'>[]>([]);
  const [bizIdx, setBizIdx] = useState(0);
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string) => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };
  const supabase = createClient();

  // Cargar brandLogo del super_super_admin y comercios del super_admin
  useEffect(() => {
    supabase
      .from('profiles')
      .select('panel_theme')
      .eq('role', 'super_super_admin')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.panel_theme) {
          const pt = data.panel_theme as Record<string, unknown>;
          if (typeof pt.brandLogo === 'string' && pt.brandLogo) setBrandLogo(pt.brandLogo);
        }
      });

    supabase
      .from('comercios')
      .select('id, name, color, photo_url')
      .eq('super_admin_id', profile.id)
      .order('name')
      .then(({ data }) => {
        if (data?.length) setComercios(data as Pick<Comercio, 'id' | 'name' | 'color' | 'photo_url'>[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  // Rotación de fotos de comercios cada 3 s
  useEffect(() => {
    if (comercios.length <= 1) return;
    const t = setInterval(() => { setBizIdx(i => (i + 1) % comercios.length); }, 3000);
    return () => clearInterval(t);
  }, [comercios.length]);

  const currentBiz = comercios[bizIdx];
  const roleThumb = currentBiz ? {
    src: currentBiz.photo_url ?? null,
    color: currentBiz.color,
    initials: currentBiz.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
    label: 'Super Admin',
    bizIdx,
  } : undefined;

  const item = NAV.find(n => n.href === '/super/' + view || (view === 'comercios' && n.href === '/super')) ?? NAV[0];

  return (
    <div className="app">
      <Sidebar
        profile={profile}
        navItems={NAV}
        shopName={profile.alias ?? profile.full_name}
        shopSub={`Super Admin · ${currentBiz?.name ?? profile.email}`}
        shopColor={profile.color}
        shopImg={profile.avatar_url ?? null}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        brandLogo={brandLogo || null}
        roleThumb={roleThumb}
      />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}
      <main className="main">
        <Topbar title={item.title} sub={item.sub} onMenu={() => setSideOpen(true)} onHelp={() => setHelp(h => !h)} />
        <div className="content">
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>
      <MayloDrawer
        open={help}
        onClose={() => setHelp(false)}
        roleLabel="Super Admin"
        intro="Soy Maylo, tu copiloto de la red. Vigilo el recaudo de cada comercio y te aviso si alguno se cae o se desconecta."
        alerts={[]}
        tips={[]}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('¡Eso! 🎺'); setTimeout(() => setDancing(false), 4800); }}
      />
      <MayloDock onOpen={() => setHelp(true)} message="Tu red está lista. Abre este panel para revisar alertas y acciones." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
