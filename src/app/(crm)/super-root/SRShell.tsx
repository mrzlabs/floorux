'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { getVisualConfig } from '@/components/shell/VisualTheme';
import { useTheme } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

const NAV = [
  { href: '/super-root', label: 'Dashboard', icon: 'dash', title: 'Dashboard global', sub: 'Vista completa del sistema' },
  { href: '/super-root/super-admins', label: 'Super Admins', icon: 'super', title: 'Super Admins', sub: 'Gestión de franquiciados' },
  { href: '/super-root/comercios', label: 'Comercios', icon: 'biz', title: 'Todos los comercios', sub: 'Vista completa de la red' },
  { href: '/super-root/reportes', label: 'Reportes', icon: 'chart', title: 'Reportes de rentabilidad', sub: 'Suscripciones, ingresos y proyecciones' },
  { href: '/super-root/usuarios', label: 'Usuarios', icon: 'users', title: 'Usuarios', sub: 'Todos los usuarios del sistema' },
  { href: '/super-root/logs', label: 'Logs', icon: 'history', title: 'Logs de auditoría', sub: 'Registro de actividad' },
  { href: '/super-root/auditoria', label: 'Auditoría', icon: 'check', title: 'Auditoría de inventario', sub: 'Cuadre global inventario vs ventas' },
  { href: '/super-root/soporte', label: 'Soporte', icon: 'chat', title: 'Soporte de la red', sub: 'Solicitudes directas de Super Admins' },
  { href: '/super-root/cuenta', label: 'Mi cuenta', icon: 'user', title: 'Mi cuenta', sub: 'Perfil y personalización' },
];

interface SRShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function SRShell({ profile, view, children }: SRShellProps) {
  const _theme = getVisualConfig(profile.panel_theme, '#B57BE0');
  useTheme(_theme.mode, _theme.palette);
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string) => {
    setToast({ msg });
    setTimeout(() => setToast(null), 2400);
  };

  const item = NAV.find(n => n.href.includes(view)) ?? NAV[0];

  return (
    <div className="app sr-shell">
      <style>{`.sr-shell .nav-i{font-size:15px}.sr-shell .nav-i svg{width:20px;height:20px}`}</style>
      <Sidebar profile={profile} navItems={NAV} shopName="OperUX · Sistema" shopSub="Super Root · Control total" shopColor={profile.color} open={sideOpen} onClose={() => setSideOpen(false)} />
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
        roleLabel="Super Root"
        intro="Soy Maylo, tu asistente global. Te ayudo a supervisar franquiciados, comercios, usuarios, auditorías y actividad del sistema."
        alerts={[]}
        tips={[
          'Revisa los logs para identificar cambios críticos.',
          'Valida comercios inactivos antes de suspender usuarios.',
          'Usa auditoría para contrastar inventario y ventas.',
        ]}
        dancing={dancing}
        onDance={() => {
          setDancing(true);
          fire('Maylo está activo');
          setTimeout(() => setDancing(false), 4800);
        }}
      />
      <MayloDock onOpen={() => setHelp(true)} message="Control global listo. Revisa actividad, suscripciones y alertas de inventario." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
