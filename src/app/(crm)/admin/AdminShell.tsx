'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { VisualTheme } from '@/components/shell/VisualTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import type { Profile, Comercio } from '@/types/db';

const NAV_ITEMS = (lowStockCount: number) => [
  { href: '/admin/resumen', label: 'Resumen', icon: 'dash', title: 'Resumen del local', sub: 'Noche en curso' },
  { href: '/admin/reportes', label: 'Reportes', icon: 'chart', title: 'Reportes', sub: 'Ventas diarias, semanales y mensuales' },
  { href: '/admin/inventario', label: 'Inventario', icon: 'box', title: 'Inventario y conceptos', sub: 'Stock, ganancia y alertas', badge: lowStockCount },
  { href: '/admin/empleados', label: 'Equipo', icon: 'users', title: 'Equipo', sub: 'Empleados, reportes y logueos' },
  { href: '/admin/chat', label: 'Chat', icon: 'chat', title: 'Chat interno', sub: 'Mensajes del equipo' },
  { href: '/admin/perfil', label: 'Mi local', icon: 'user', title: 'Mi local', sub: 'Datos y personalización' },
];

const TIPS: Record<string, string[]> = {
  resumen: ['Tu noche va arriba.', 'Te marco en rojo lo que se está agotando.'],
  reportes: ['Descarga el PDF para enviarlo al dueño.'],
  inventario: ['Define la alerta mínima para que te avise.'],
  empleados: ['Activa o desactiva un empleado al instante.'],
  chat: ['Comunícate con tu equipo en tiempo real.'],
  perfil: ['Sube la foto de tu local.'],
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

export function AdminShell({ profile, comercio, view, lowStockCount = 0, operating = false, returnPath = null, children }: AdminShellProps) {
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string, icon = 'check') => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };

  const nav = NAV_ITEMS(lowStockCount);
  const item = nav.find(n => n.href.endsWith(view)) ?? nav[0];

  return (
    <div className="app">
      <VisualTheme settings={comercio.settings} />
      <Sidebar profile={profile} navItems={nav} shopName={comercio.name} shopSub={`${comercio.city} · Plan ${comercio.plan}`} shopColor={comercio.color} open={sideOpen} onClose={() => setSideOpen(false)} returnPath={returnPath} />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}
      <main className="main">
        <Topbar title={item.title} sub={item.sub} alertCount={lowStockCount} onMenu={() => setSideOpen(true)} onHelp={() => setHelp(h => !h)} />
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
      <MayloDrawer open={help} onClose={() => setHelp(false)} roleLabel="Admin" intro="Soy Maylo. Te aviso apenas un producto se va a acabar y te recuerdo cuando un turno se cierra para que nada se te escape." alerts={[]} tips={TIPS[view] ?? []} dancing={dancing} onDance={() => { setDancing(true); fire('¡Eso! 🎺', 'spark'); setTimeout(() => setDancing(false), 4800); }} />
      <MayloDock onOpen={() => setHelp(true)} message={lowStockCount > 0 ? `Hay ${lowStockCount} alertas de inventario.` : 'El local está listo para operar.'} alerts={lowStockCount} />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
