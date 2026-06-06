'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { VisualTheme } from '@/components/shell/VisualTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

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
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string) => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };

  const item = NAV.find(n => n.href === '/super/' + view || (view === 'comercios' && n.href === '/super')) ?? NAV[0];

  return (
    <div className="app">
      <VisualTheme settings={profile.panel_theme} fallbackColor={profile.color} />
      <Sidebar profile={profile} navItems={NAV} shopName={`Grupo · ${profile.alias ?? profile.full_name}`} shopSub={`Super Admin · ${profile.email}`} shopColor={profile.color} open={sideOpen} onClose={() => setSideOpen(false)} />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}
      <main className="main">
        <Topbar title={item.title} sub={item.sub} onMenu={() => setSideOpen(true)} onHelp={() => setHelp(h => !h)} />
        <div className="content">
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>
      <MayloDrawer open={help} onClose={() => setHelp(false)} roleLabel="Super Admin" intro="Soy Maylo, tu copiloto de la red. Vigilo el recaudo de cada comercio y te aviso si alguno se cae o se desconecta." alerts={[]} tips={[]} dancing={dancing} onDance={() => { setDancing(true); fire('¡Eso! 🎺'); setTimeout(() => setDancing(false), 4800); }} />
      <MayloDock onOpen={() => setHelp(true)} message="Tu red está lista. Abre este panel para revisar alertas y acciones." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
