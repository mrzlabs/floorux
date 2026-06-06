'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { CommerceVisualTheme } from '@/components/shell/VisualTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

const NAV = [
  { href: '/empleado/mesas', label: 'Mesas', icon: 'mesas', title: 'Mesas', sub: 'Abre, despacha y cobra' },
  { href: '/empleado/turno', label: 'Mi turno', icon: 'clock', title: 'Mi turno', sub: 'Resumen y cierre' },
  { href: '/empleado/historial', label: 'Historial', icon: 'history', title: 'Mi historial', sub: 'Lo que has vendido' },
  { href: '/empleado/chat', label: 'Chat', icon: 'chat', title: 'Chat interno', sub: 'Admin y Super Admin enlazados' },
];

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
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);

  const navItem = NAV.find(n => n.href.endsWith(view)) ?? NAV[0];
  const fire = (msg: string, icon = 'check') => { setToast({ msg, icon }); setTimeout(() => setToast(null), 2400); };

  return (
    <div className="app">
      <CommerceVisualTheme comercioId={profile.comercio_id} />
      <Sidebar profile={profile} navItems={NAV} shopName={profile.full_name} shopSub={profile.alias ?? 'Empleado'} shopColor={profile.color} open={sideOpen} onClose={() => setSideOpen(false)} />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}
      <main className="main">
        <Topbar title={navItem.title} sub={navItem.sub} onMenu={() => setSideOpen(true)} onHelp={() => setHelp(h => !h)} />
        <div className="content">
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>
      <MayloDrawer open={help} onClose={() => setHelp(false)} roleLabel="Empleado" intro="Soy Maylo, tu asistente de barra. Abre mesas, despacha del inventario y yo te aviso si algo se está agotando." alerts={[]} tips={TIPS[view] ?? []} dancing={dancing} onDance={() => { setDancing(true); fire('¡Eso! 🎺 Maylo está skankin\'', 'spark'); setTimeout(() => setDancing(false), 4800); }} />
      <MayloDock onOpen={() => setHelp(true)} message="Estamos listos para comenzar. Abre una mesa o consulta tu turno." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
